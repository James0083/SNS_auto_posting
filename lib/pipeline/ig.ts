import path from "node:path";
import { getDb } from "@/lib/db";
import { jobLog } from "@/lib/log";
import { getSettings } from "@/lib/settings";
import { IG_IMAGE_DIR } from "@/lib/paths";
import {
  generateIgCaption,
  generateIgCaptionForUpload,
  generateIgCaptionFromSource,
} from "@/lib/ai/igCaption";
import { generateIgHookTitles } from "@/lib/ai/igHook";
import { buildImagePrompt, generateImage } from "@/lib/ai/imagegen";
import { convertCapturedPhoto } from "@/lib/ai/igImageConvert";
import type { IgMode, IgPhotoSource } from "@/lib/types/ig";

type IgContentSource = "keyword" | "adapt";

type IgPostRow = {
  id: number;
  keyword: string;
  mode: IgMode;
  carousel: number;
  slide_count: number;
  image_style: "photo" | "illust";
  photo_source: IgPhotoSource;
  content_source: IgContentSource;
  caption: string | null;
  source_text: string | null;
  source_image_paths_json: string | null;
};

type Slide = { query: string; role: "cover" | "body" | "cta" };

function setStatus(id: number, status: string, error?: string) {
  getDb()
    .prepare(
      "UPDATE ig_posts SET status = ?, error = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .run(status, error ?? null, id);
}

function slideRole(index: number, total: number): "cover" | "body" | "cta" {
  if (total === 1) return "cover";
  if (index === 0) return "cover";
  if (index === total - 1) return "cta";
  return "body";
}

function sourceImagesOf(row: IgPostRow): string[] | undefined {
  const images: string[] = row.source_image_paths_json
    ? JSON.parse(row.source_image_paths_json)
    : [];
  return images.length ? images : undefined;
}

// 캡션 첫 줄로 쓸 후킹 제목 3안을 생성해 저장한다. 실패해도 캡션·이미지 생성은 막지 않는다
// (후킹 제목은 부가 기능 — jobLog로만 알리고 job 자체는 실패 처리하지 않는다).
//
// ⚠️ 반드시 "이미 완성된 캡션 텍스트"를 근거로 만든다 — 키워드/원문만 보고 캡션과
// 별개로 상상해서 만들면(과거 버그) 캡션이 실제로 다루는 내용과 다른 제목이 나올 수 있다.
async function saveHookTitles(jobId: number, caption: string, sourceImages?: string[]): Promise<boolean> {
  const res = await generateIgHookTitles({ context: caption, sourceImages });
  if (!res.ok) {
    jobLog("ig", jobId, "warn", `후킹 제목 생성 실패: ${res.error}`);
    return false;
  }

  const db = getDb();
  db.prepare("DELETE FROM ig_titles WHERE ig_post_id = ?").run(jobId);
  res.data.candidates.forEach((text, i) => {
    db.prepare(
      "INSERT INTO ig_titles (ig_post_id, candidate_index, text, chosen) VALUES (?, ?, ?, ?)",
    ).run(jobId, i, text, i === 0 ? 1 : 0);
  });
  jobLog("ig", jobId, "info", "후킹 제목 3안 생성 완료.");
  return true;
}

// 캡션 AI가 정한 slides[].query로 캐러셀 이미지를 처음부터 생성한다.
// photo_source="ai"와 content_source="adapt" 두 흐름이 공유한다.
async function renderSlides(
  jobId: number,
  slides: Slide[],
  imageStyle: "photo" | "illust",
): Promise<number> {
  const db = getDb();
  const settings = getSettings();
  let failedSlides = 0;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    const prompt = buildImagePrompt(slide.query, imageStyle);
    const outPath = path.join(IG_IMAGE_DIR, String(jobId), `slide_${i + 1}.jpg`);

    const imgRes = await generateImage({
      prompt,
      steps: settings.cfImageSteps,
      aspect: "portrait4x5",
      outPath,
    });

    if (imgRes.ok) {
      db.prepare(
        `INSERT INTO ig_images (ig_post_id, slide_index, role, local_path, source_site, verdict_ok, gen_prompt)
         VALUES (?, ?, ?, ?, 'ai', 1, ?)`,
      ).run(jobId, i, slide.role, imgRes.path, prompt);
      jobLog("ig", jobId, "info", `이미지 ${i + 1}/${slides.length} 생성 완료.`);
    } else {
      failedSlides++;
      db.prepare(
        `INSERT INTO ig_images (ig_post_id, slide_index, role, local_path, source_site, verdict_ok, verdict_reason, gen_prompt)
         VALUES (?, ?, ?, NULL, 'ai', 0, ?, ?)`,
      ).run(jobId, i, slide.role, imgRes.error, prompt);
      jobLog("ig", jobId, "warn", `이미지 ${i + 1} 생성 실패: ${imgRes.error}`);
    }
  }

  return failedSlides;
}

function finishAfterSlides(jobId: number, total: number, failed: number, unit: string) {
  if (total > 0 && failed === total) {
    setStatus(jobId, "failed", `${unit} 생성이 전부 실패했습니다.`);
    return;
  }
  setStatus(jobId, "done");
  jobLog(
    "ig",
    jobId,
    "info",
    failed > 0
      ? `완료 (${unit} ${failed}장 실패 — 캡션과 나머지 이미지는 정상 생성됨).`
      : "완료.",
  );
}

// photoSource="ai" — 캡션 AI가 정한 장면 묘사로 이미지를 처음부터 생성한다.
async function runAiPhotoJob(row: IgPostRow): Promise<void> {
  const db = getDb();
  const jobId = row.id;

  const captionRes = await generateIgCaption({
    keyword: row.keyword,
    mode: row.mode,
    slideCount: row.slide_count,
  });

  if (!captionRes.ok) {
    setStatus(jobId, "failed", captionRes.error);
    jobLog("ig", jobId, "error", `캡션 생성 실패: ${captionRes.error}`);
    return;
  }

  db.prepare("UPDATE ig_posts SET caption = ? WHERE id = ?").run(captionRes.data.caption, jobId);
  jobLog("ig", jobId, "info", "캡션 생성 완료.");

  const titlesPromise = saveHookTitles(jobId, captionRes.data.caption, sourceImagesOf(row));
  const failed = await renderSlides(jobId, captionRes.data.slides, row.image_style);
  await titlesPromise;
  finishAfterSlides(jobId, captionRes.data.slides.length, failed, "이미지");
}

// content_source="adapt" — 해외 원문을 각색해 캡션을 만들고, 그 내용으로 캐러셀 이미지를 생성한다.
async function runAdaptJob(row: IgPostRow): Promise<void> {
  const db = getDb();
  const jobId = row.id;
  const sourceImages: string[] = row.source_image_paths_json
    ? JSON.parse(row.source_image_paths_json)
    : [];

  const captionRes = await generateIgCaptionFromSource({
    sourceText: row.source_text ?? undefined,
    sourceImages: sourceImages.length ? sourceImages : undefined,
    slideCount: row.slide_count,
  });

  if (!captionRes.ok) {
    setStatus(jobId, "failed", captionRes.error);
    jobLog("ig", jobId, "error", `각색 캡션 생성 실패: ${captionRes.error}`);
    return;
  }

  db.prepare("UPDATE ig_posts SET caption = ? WHERE id = ?").run(captionRes.data.caption, jobId);
  jobLog("ig", jobId, "info", "각색 캡션 생성 완료.");

  const titlesPromise = saveHookTitles(
    jobId,
    captionRes.data.caption,
    sourceImages.length ? sourceImages : undefined,
  );
  const failed = await renderSlides(jobId, captionRes.data.slides, row.image_style);
  await titlesPromise;
  finishAfterSlides(jobId, captionRes.data.slides.length, failed, "이미지");
}

// photoSource="upload" — 사용자가 직접 촬영한 사진을 컨셉만 참고해 재생성한다(원본 재사용 안 함).
async function runUploadPhotoJob(row: IgPostRow): Promise<void> {
  const db = getDb();
  const jobId = row.id;
  const sourceImages: string[] = row.source_image_paths_json
    ? JSON.parse(row.source_image_paths_json)
    : [];

  if (sourceImages.length === 0) {
    setStatus(jobId, "failed", "업로드된 사진이 없습니다.");
    jobLog("ig", jobId, "error", "업로드된 사진이 없어 진행할 수 없습니다.");
    return;
  }

  const captionRes = await generateIgCaptionForUpload({
    keyword: row.keyword,
    mode: row.mode,
    photoCount: sourceImages.length,
    sourceImages,
  });

  if (!captionRes.ok) {
    setStatus(jobId, "failed", captionRes.error);
    jobLog("ig", jobId, "error", `캡션 생성 실패: ${captionRes.error}`);
    return;
  }

  db.prepare("UPDATE ig_posts SET caption = ? WHERE id = ?").run(captionRes.data.caption, jobId);
  jobLog("ig", jobId, "info", "캡션 생성 완료.");

  const titlesPromise = saveHookTitles(jobId, captionRes.data.caption, sourceImages);
  let failedSlides = 0;

  for (let i = 0; i < sourceImages.length; i++) {
    const role = slideRole(i, sourceImages.length);
    const convertRes = await convertCapturedPhoto({
      jobId,
      slideIndex: i,
      sourceImagePath: sourceImages[i]!,
      style: row.image_style,
    });

    if (convertRes.ok) {
      db.prepare(
        `INSERT INTO ig_images (ig_post_id, slide_index, role, local_path, source_site, source_path, verdict_ok, gen_prompt)
         VALUES (?, ?, ?, ?, 'upload', ?, 1, ?)`,
      ).run(jobId, i, role, convertRes.path, sourceImages[i], convertRes.prompt);
      jobLog("ig", jobId, "info", `사진 ${i + 1}/${sourceImages.length} 변환 완료.`);
    } else {
      failedSlides++;
      db.prepare(
        `INSERT INTO ig_images (ig_post_id, slide_index, role, local_path, source_site, source_path, verdict_ok, verdict_reason)
         VALUES (?, ?, ?, NULL, 'upload', ?, 0, ?)`,
      ).run(jobId, i, role, sourceImages[i], convertRes.error);
      jobLog("ig", jobId, "warn", `사진 ${i + 1} 변환 실패: ${convertRes.error}`);
    }
  }

  await titlesPromise;
  finishAfterSlides(jobId, sourceImages.length, failedSlides, "사진");
}

// fire-and-forget으로 호출한다. API 라우트에서 await하지 말 것 — 진행 상황은 로그로 확인한다.
export async function runIgJob(jobId: number): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ig_posts WHERE id = ?").get(jobId) as
    | IgPostRow
    | undefined;
  if (!row) return;

  setStatus(jobId, "generating");

  if (row.content_source === "adapt") {
    jobLog("ig", jobId, "info", "해외 콘텐츠 각색을 시작합니다.");
    await runAdaptJob(row);
    return;
  }

  jobLog(
    "ig",
    jobId,
    "info",
    row.photo_source === "upload"
      ? "캡션 생성과 사진 변환을 시작합니다."
      : "캡션·이미지 자리 생성을 시작합니다.",
  );

  if (row.photo_source === "upload") {
    await runUploadPhotoJob(row);
  } else {
    await runAiPhotoJob(row);
  }
}

// "이미지만 재생성" — 캡션은 그대로 두고, 슬라이드마다 저장된 gen_prompt(이미 만들어둔 장면 묘사)로
// 이미지만 다시 생성한다. Claude를 다시 부르지 않아 빠르고, ai/upload/adapt 세 흐름 모두
// 생성 시 gen_prompt를 저장해두므로(runAiPhotoJob/runAdaptJob/runUploadPhotoJob) 공통으로 쓸 수 있다.
// 새 row를 추가하지 않고 기존 슬라이드 row를 덮어써 이미지 그리드에 중복이 생기지 않게 한다.
export async function regenerateIgImages(jobId: number): Promise<boolean> {
  const db = getDb();
  const images = db
    .prepare(
      "SELECT id, slide_index, gen_prompt FROM ig_images WHERE ig_post_id = ? ORDER BY slide_index ASC",
    )
    .all(jobId) as { id: number; slide_index: number; gen_prompt: string | null }[];

  if (images.length === 0) {
    jobLog("ig", jobId, "warn", "재생성할 이미지가 없습니다.");
    return false;
  }

  const settings = getSettings();
  let anyOk = false;

  for (const img of images) {
    if (!img.gen_prompt) {
      jobLog("ig", jobId, "warn", `이미지 ${img.slide_index + 1} 재생성 불가 (저장된 프롬프트 없음).`);
      continue;
    }

    const outPath = path.join(IG_IMAGE_DIR, String(jobId), `slide_${img.slide_index + 1}.jpg`);
    const imgRes = await generateImage({
      prompt: img.gen_prompt,
      steps: settings.cfImageSteps,
      aspect: "portrait4x5",
      outPath,
    });

    if (imgRes.ok) {
      db.prepare("UPDATE ig_images SET local_path = ?, verdict_ok = 1, verdict_reason = NULL WHERE id = ?").run(
        imgRes.path,
        img.id,
      );
      jobLog("ig", jobId, "info", `이미지 ${img.slide_index + 1} 재생성 완료.`);
      anyOk = true;
    } else {
      db.prepare("UPDATE ig_images SET local_path = NULL, verdict_ok = 0, verdict_reason = ? WHERE id = ?").run(
        imgRes.error,
        img.id,
      );
      jobLog("ig", jobId, "warn", `이미지 ${img.slide_index + 1} 재생성 실패: ${imgRes.error}`);
    }
  }

  return anyOk;
}

// "제목만 재생성" — 후킹 제목 3안만 다시 만든다. 캡션·이미지에는 영향 없음.
export async function regenerateIgTitles(jobId: number): Promise<boolean> {
  const row = getDb().prepare("SELECT * FROM ig_posts WHERE id = ?").get(jobId) as
    | IgPostRow
    | undefined;
  if (!row) return false;
  if (!row.caption) {
    jobLog("ig", jobId, "warn", "캡션이 아직 없어 후킹 제목을 만들 수 없습니다.");
    return false;
  }
  return saveHookTitles(jobId, row.caption, sourceImagesOf(row));
}
