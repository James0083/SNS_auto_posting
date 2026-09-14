import path from "node:path";
import { runClaudeJson } from "@/lib/claude";
import { generateImage, STYLE_TOKENS, NO_TEXT_SUFFIX, type ImageStyle } from "@/lib/ai/imagegen";
import { getSettings } from "@/lib/settings";
import { IG_IMAGE_DIR } from "@/lib/paths";
import { ReelsImagePromptResult } from "@/lib/types/reels";

export type IgImageConvertResult =
  | { ok: true; path: string; prompt: string }
  | { ok: false; error: string };

// 사용자가 직접 촬영한 사진을 그대로 올리지 않고, 컨셉만 참고해 완전히 새로운 이미지로
// 재생성한다(원본 재사용 금지 — 초상권/저작권 회피). lib/ai/reelsImage.ts와 같은 패턴이지만
// 인스타그램 피드 규격(4:5)과 사용자가 고른 스타일(photo/illust)을 따른다.
export async function convertCapturedPhoto(input: {
  jobId: number;
  slideIndex: number;
  sourceImagePath: string;
  style: ImageStyle;
}): Promise<IgImageConvertResult> {
  const promptRes = await runClaudeJson(
    `
아래 첨부된 사진의 핵심 컨셉(피사체 종류, 구도, 색감, 분위기)만 참고해 완전히 새로운 이미지를 위한
FLUX 프롬프트를 영어로 설계하라.

규칙:
- 영어, 한 문단, 40단어 이내
- 피사체/구도/조명/배경/질감을 명시하되, 사진 속 실존 인물의 얼굴·특정 브랜드 로고·상표·워터마크·
  계정명은 그대로 재현하지 않는다 — 컨셉만 참고해 일반화한다
- 스타일 톤: ${STYLE_TOKENS[input.style]}
- 끝에 반드시 "${NO_TEXT_SUFFIX}" 를 포함한다

JSON 스키마로만 응답: { "prompt": string }
`.trim(),
    ReelsImagePromptResult,
    { images: [input.sourceImagePath], retries: 2 },
  );

  if (!promptRes.ok) return { ok: false, error: promptRes.error };

  const settings = getSettings();
  const outPath = path.join(
    IG_IMAGE_DIR,
    String(input.jobId),
    `slide_${input.slideIndex + 1}.jpg`,
  );

  const imgRes = await generateImage({
    prompt: promptRes.data.prompt,
    steps: settings.cfImageSteps,
    aspect: "portrait4x5",
    outPath,
  });

  if (!imgRes.ok) return { ok: false, error: imgRes.error };
  return { ok: true, path: imgRes.path, prompt: promptRes.data.prompt };
}
