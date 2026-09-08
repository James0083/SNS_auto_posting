import { getDb } from "@/lib/db";
import { jobLog } from "@/lib/log";
import { generateHookTitles } from "@/lib/ai/reelsHook";
import { generateReelsBody } from "@/lib/ai/reelsBody";
import { generateReelsImage } from "@/lib/ai/reelsImage";
import { runAutomatedQc } from "@/lib/ai/reelsQC";
import { convertMarkdownBold } from "@/lib/text/boldConvert";

type ReelsJobRow = {
  id: number;
  source_text: string | null;
  source_image_paths_json: string | null;
};

function setStatus(id: number, status: string, error?: string) {
  getDb()
    .prepare(
      "UPDATE reels_jobs SET status = ?, error = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(status, error ?? null, id);
}

function loadJob(jobId: number): { sourceText?: string; sourceImages: string[] } | null {
  const row = getDb().prepare("SELECT * FROM reels_jobs WHERE id = ?").get(jobId) as
    | ReelsJobRow
    | undefined;
  if (!row) return null;
  return {
    sourceText: row.source_text ?? undefined,
    sourceImages: row.source_image_paths_json ? JSON.parse(row.source_image_paths_json) : [],
  };
}

// 제목 3안만 재생성한다. 본문·이미지와 완전히 독립적으로 호출 가능하다.
export async function regenerateTitles(jobId: number): Promise<boolean> {
  const input = loadJob(jobId);
  if (!input) return false;

  const res = await generateHookTitles(input);
  if (!res.ok) {
    jobLog("reels", jobId, "warn", `제목 생성 실패: ${res.error}`);
    return false;
  }

  const db = getDb();
  db.prepare("DELETE FROM reels_titles WHERE reels_job_id = ?").run(jobId);
  res.data.candidates.forEach((text, i) => {
    db.prepare(
      "INSERT INTO reels_titles (reels_job_id, candidate_index, text, chosen) VALUES (?, ?, ?, ?)",
    ).run(jobId, i, text, i === 0 ? 1 : 0);
  });
  jobLog("reels", jobId, "info", "후킹 제목 3안 생성 완료.");
  return true;
}

// 본문만 재생성한다. 기존 이미지에는 영향 없음(이미지를 다시 만들고 싶으면 regenerateImage를 별도 호출).
export async function regenerateBody(jobId: number): Promise<boolean> {
  const input = loadJob(jobId);
  if (!input) return false;

  const res = await generateReelsBody(input);
  if (!res.ok) {
    jobLog("reels", jobId, "error", `본문 생성 실패: ${res.error}`);
    return false;
  }

  // 인스타그램 캡션은 마크다운을 렌더링하지 않으므로, 저장 전에 실제로 복사해 붙여넣을 수 있는
  // 형태로 변환한다. 단, 유니코드 볼드는 라틴 문자·숫자만 지원해 한글 강조는 적용되지 않는다
  // (lib/text/boldConvert.ts 상단 주석 참고) — 한글 강조가 있었다면 로그로 알린다.
  const { text: bodyForOutput, hangulBoldSkipped } = convertMarkdownBold(res.data.body);
  if (hangulBoldSkipped > 0) {
    jobLog(
      "reels",
      jobId,
      "warn",
      `한글 강조 ${hangulBoldSkipped}곳은 유니코드 볼드로 표현할 수 없어 별표만 제거했습니다 (한글은 굵게 표시가 불가능합니다).`,
    );
  }

  const qc = runAutomatedQc(bodyForOutput);
  getDb()
    .prepare(
      `INSERT INTO reels_drafts (reels_job_id, body_text, cta_included_json, qc_json) VALUES (?, ?, ?, ?)`,
    )
    .run(jobId, bodyForOutput, JSON.stringify(res.data.ctaIncluded), JSON.stringify(qc));
  jobLog("reels", jobId, "info", "본문 각색 완료.");
  return true;
}

// 이미지만 재생성한다. 가장 최근 본문(body_text)을 기준으로 프롬프트를 만든다 —
// 본문이 아직 없으면 이미지도 만들 수 없다(선행 조건).
export async function regenerateImage(jobId: number): Promise<boolean> {
  const input = loadJob(jobId);
  if (!input) return false;

  const draft = getDb()
    .prepare(
      "SELECT body_text FROM reels_drafts WHERE reels_job_id = ? ORDER BY id DESC LIMIT 1",
    )
    .get(jobId) as { body_text: string } | undefined;

  if (!draft) {
    jobLog("reels", jobId, "warn", "본문이 아직 없어 이미지를 생성할 수 없습니다.");
    return false;
  }

  const imgRes = await generateReelsImage({
    jobId,
    slideIndex: 0,
    sourceImages: input.sourceImages,
    bodyText: draft.body_text,
  });

  const db = getDb();
  if (imgRes.ok) {
    db.prepare(
      `INSERT INTO reels_images (reels_job_id, slide_index, local_path, gen_prompt, verdict_ok) VALUES (?, 0, ?, ?, 1)`,
    ).run(jobId, imgRes.path, imgRes.prompt);
    jobLog("reels", jobId, "info", "이미지 재생성 완료.");
    return true;
  }
  db.prepare(
    `INSERT INTO reels_images (reels_job_id, slide_index, local_path, verdict_ok, verdict_reason) VALUES (?, 0, NULL, 0, ?)`,
  ).run(jobId, imgRes.error);
  jobLog("reels", jobId, "warn", `이미지 재생성 실패: ${imgRes.error}`);
  return false;
}

// fire-and-forget으로 호출한다. 제목/본문을 병렬로 시작하고, 이미지는 본문 완료 후에 이어서 만든다
// (이미지 프롬프트가 본문 내용을 참고하므로 body -> image는 순차 의존).
export async function runReelsJob(jobId: number): Promise<void> {
  const job = loadJob(jobId);
  if (!job) return;

  setStatus(jobId, "generating");
  jobLog("reels", jobId, "info", "릴스 각색을 시작합니다.");

  const [, bodyOk] = await Promise.all([
    regenerateTitles(jobId),
    regenerateBody(jobId).then(async (ok) => {
      if (ok) await regenerateImage(jobId);
      return ok;
    }),
  ]);

  setStatus(jobId, bodyOk ? "done" : "failed", bodyOk ? undefined : "본문 생성 실패");
  jobLog("reels", jobId, "info", bodyOk ? "완료." : "본문 생성 실패로 종료합니다.");
}
