import fs from "node:fs/promises";
import sharp from "sharp";
import { neuronsPerImage } from "@/lib/ai/neurons";

export type ImageStyle = "photo" | "illust";
export type Aspect = "square" | "portrait4x5" | "story9x16";

// photo 톤은 "AI가 만든 티가 나는" 매끈한 CG/렌더링 느낌을 피하고 최대한 실사에 가깝게 만드는 게
// 목표다(사용자 피드백). "photorealistic, high detail" 정도로는 디퓨전 모델 특유의 매끈한 광택이
// 남기 쉬워서, 카메라로 찍은 듯한 질감·조명과 "CG/렌더링/일러스트/애니메이션이 아님"을 명시한다.
// illust는 의도적으로 선택한 스타일이라 그대로 둔다.
export const STYLE_TOKENS: Record<ImageStyle, string> = {
  photo:
    "candid photorealistic photo, shot on a real camera, natural ambient lighting, realistic skin and material texture, shallow depth of field, documentary style, unretouched — not CGI, not 3D render, not digital art, not illustration, not anime",
  illust: "clean flat vector illustration, simple shapes, soft muted color palette, minimal, lots of white space",
};

export const NO_TEXT_SUFFIX = "no text, no letters, no words, no watermark, no logo";

export function buildImagePrompt(sceneDescription: string, style: ImageStyle): string {
  return `${sceneDescription}, ${STYLE_TOKENS[style]}, ${NO_TEXT_SUFFIX}`;
}

// FLUX-1-schnell 생성 결과는 정사각형(1024x1024) 기준으로 가정한다.
// 4:5 / 9:16 같은 세로 비율은 API가 임의 width/height를 지원하는지 미검증이므로,
// 정사각형을 생성한 뒤 폭을 중앙 기준으로 잘라 비율을 맞춘다(높이는 그대로 유지).
// ⚠️ 실측 필요: Workers AI가 실제로 width/height 파라미터를 지원한다면 이 크롭 단계는 불필요해질 수 있다.
const ASPECT_CROP_WIDTH: Record<Aspect, number> = {
  square: 1024,
  portrait4x5: 819, // 1024 * 4/5
  story9x16: 576, // 1024 * 9/16
};

export type GenerateImageResult =
  | { ok: true; path: string; neurons: number }
  | { ok: false; error: string };

export async function generateImage(opts: {
  prompt: string;
  steps: number;
  aspect: Aspect;
  outPath: string;
}): Promise<GenerateImageResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    return { ok: false, error: "Cloudflare 키가 설정되지 않았습니다. .env.local을 확인하세요." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: opts.prompt, steps: opts.steps }),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      return { ok: false, error: `Cloudflare 응답 오류: ${res.status} ${await res.text()}` };
    }

    const json = (await res.json()) as { result?: { image?: string } };
    const b64 = json.result?.image;
    if (!b64) {
      return { ok: false, error: "Cloudflare 응답에 이미지 데이터가 없습니다." };
    }

    const raw = Buffer.from(b64, "base64");
    if (raw.byteLength < 2000) {
      return { ok: false, error: "생성된 이미지가 너무 작습니다 (생성 실패로 간주)." };
    }

    const cropWidth = ASPECT_CROP_WIDTH[opts.aspect];
    const left = Math.round((1024 - cropWidth) / 2);
    const output = await sharp(raw)
      .extract({ left, top: 0, width: cropWidth, height: 1024 })
      .jpeg({ quality: 90 })
      .toBuffer();

    await fs.mkdir(opts.outPath.substring(0, opts.outPath.lastIndexOf("/")), { recursive: true });
    await fs.writeFile(opts.outPath, output);

    return { ok: true, path: opts.outPath, neurons: neuronsPerImage(opts.steps, 1024) };
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") {
      return { ok: false, error: "이미지 생성이 90초 안에 끝나지 않았습니다." };
    }
    return { ok: false, error: `이미지 생성 실패: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}
