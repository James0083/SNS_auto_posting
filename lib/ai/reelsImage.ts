import path from "node:path";
import { runClaudeJson } from "@/lib/claude";
import { generateImage, STYLE_TOKENS, NO_TEXT_SUFFIX } from "@/lib/ai/imagegen";
import { getSettings } from "@/lib/settings";
import { REELS_IMAGE_DIR } from "@/lib/paths";
import { ReelsImagePromptResult } from "@/lib/types/reels";

export type ReelsImageResult =
  | { ok: true; path: string; prompt: string }
  | { ok: false; error: string };

export async function generateReelsImage(input: {
  jobId: number;
  slideIndex: number;
  sourceImages?: string[];
  bodyText: string;
}): Promise<ReelsImageResult> {
  const promptRes = await runClaudeJson(
    `
아래 릴스 본문이 다루는 장면을 가장 잘 대표하는 이미지 1장을 위한 FLUX 프롬프트를 영어로 설계하라.

규칙:
- 영어, 한 문단, 40단어 이내
- 피사체/구도/조명/배경/질감을 명시하되, 카메라로 찍은 듯한 사실적인 장면으로 묘사한다.
  CG/3D 렌더링/일러스트/애니메이션처럼 보이는 표현은 쓰지 않는다(애니메이션·CG를 의도한 콘텐츠가
  아닌 한, "AI가 만든 티가 나는" 매끈한 이미지가 아니라 최대한 실사에 가까운 이미지가 목표다).
- 원문 이미지 속 실존 인물의 얼굴, 특정 브랜드 로고, 영화/드라마 스틸컷, 캐릭터는 그대로 재현하지 않는다 — 구도·컨셉만 참고해 완전히 새로운 장면으로 일반화한다
- 끝에 반드시 "${STYLE_TOKENS.photo}, ${NO_TEXT_SUFFIX}" 를 포함한다

릴스 본문:
${input.bodyText}

JSON 스키마로만 응답: { "prompt": string }
`.trim(),
    ReelsImagePromptResult,
    { images: input.sourceImages, retries: 2 },
  );

  if (!promptRes.ok) return { ok: false, error: promptRes.error };

  const settings = getSettings();
  const outPath = path.join(
    REELS_IMAGE_DIR,
    String(input.jobId),
    `slide_${input.slideIndex + 1}_${Date.now()}.jpg`,
  );

  const imgRes = await generateImage({
    prompt: promptRes.data.prompt,
    steps: settings.cfImageSteps,
    aspect: "story9x16",
    outPath,
  });

  if (!imgRes.ok) return { ok: false, error: imgRes.error };
  return { ok: true, path: imgRes.path, prompt: promptRes.data.prompt };
}
