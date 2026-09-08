import path from "node:path";
import { getDb } from "@/lib/db";
import { jobLog } from "@/lib/log";
import { getSettings } from "@/lib/settings";
import { IG_IMAGE_DIR } from "@/lib/paths";
import { generateIgCaption, generateIgCaptionForUpload } from "@/lib/ai/igCaption";
import { buildImagePrompt, generateImage } from "@/lib/ai/imagegen";
import { convertCapturedPhoto } from "@/lib/ai/igImageConvert";
import type { IgMode, IgPhotoSource } from "@/lib/types/ig";

type IgPostRow = {
  id: number;
  keyword: string;
  mode: IgMode;
  carousel: number;
  slide_count: number;
  image_style: "photo" | "illust";
  photo_source: IgPhotoSource;
  source_image_paths_json: string | null;
};

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

  db.prepare("UPDATE ig_posts SET caption = ?, hashtags_json = ? WHERE id = ?").run(
    captionRes.data.caption,
    JSON.stringify(captionRes.data.hashtags),
    jobId,
  );
  jobLog("ig", jobId, "info", `캡션 생성 완료 (해시태그 ${captionRes.data.hashtags.length}개).`);

  const settings = getSettings();
  let failedSlides = 0;

  for (let i = 0; i < captionRes.data.slides.length; i++) {
    const slide = captionRes.data.slides[i]!;
    const prompt = buildImagePrompt(slide.query, row.image_style);
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
      jobLog("ig", jobId, "info", `이미지 ${i + 1}/${captionRes.data.slides.length} 생성 완료.`);
    } else {
      failedSlides++;
      db.prepare(
        `INSERT INTO ig_images (ig_post_id, slide_index, role, local_path, source_site, verdict_ok, verdict_reason, gen_prompt)
         VALUES (?, ?, ?, NULL, 'ai', 0, ?, ?)`,
      ).run(jobId, i, slide.role, imgRes.error, prompt);
      jobLog("ig", jobId, "warn", `이미지 ${i + 1} 생성 실패: ${imgRes.error}`);
    }
  }

  if (failedSlides === captionRes.data.slides.length) {
    setStatus(jobId, "failed", "이미지 생성이 전부 실패했습니다.");
    return;
  }

  setStatus(jobId, "done");
  jobLog(
    "ig",
    jobId,
    "info",
    failedSlides > 0
      ? `완료 (이미지 ${failedSlides}장 실패 — 캡션과 나머지 이미지는 정상 생성됨).`
      : "완료.",
  );
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

  db.prepare("UPDATE ig_posts SET caption = ?, hashtags_json = ? WHERE id = ?").run(
    captionRes.data.caption,
    JSON.stringify(captionRes.data.hashtags),
    jobId,
  );
  jobLog("ig", jobId, "info", `캡션 생성 완료 (해시태그 ${captionRes.data.hashtags.length}개).`);

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

  if (failedSlides === sourceImages.length) {
    setStatus(jobId, "failed", "사진 변환이 전부 실패했습니다.");
    return;
  }

  setStatus(jobId, "done");
  jobLog(
    "ig",
    jobId,
    "info",
    failedSlides > 0
      ? `완료 (사진 ${failedSlides}장 변환 실패 — 캡션과 나머지 이미지는 정상 생성됨).`
      : "완료.",
  );
}

// fire-and-forget으로 호출한다. API 라우트에서 await하지 말 것 — 진행 상황은 로그로 확인한다.
export async function runIgJob(jobId: number): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ig_posts WHERE id = ?").get(jobId) as
    | IgPostRow
    | undefined;
  if (!row) return;

  setStatus(jobId, "generating");
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
