import { runClaudeJson } from "@/lib/claude";
import { loadReelsRules } from "@/lib/ai/reelsRules";
import { ReelsBodyResult } from "@/lib/types/reels";

export async function generateReelsBody(input: { sourceText?: string; sourceImages?: string[] }) {
  const prompt = `
아래 원문(해외 SNS 콘텐츠)을 한국어 Instagram Reels 설명란용 본문으로 번역·각색하라.
시스템 프롬프트에 있는 모든 규칙(문체, 구조, CTA 구성, 안전·윤리 필터, 출력 형식)을 그대로 지켜라.
해시태그는 절대 포함하지 않는다.

${input.sourceText ? `원문 텍스트:\n${input.sourceText}` : "원문 텍스트 없음 — 첨부된 이미지의 시각 정보를 주 소스로 구성하라."}

본문(body)과, 실제로 포함한 CTA 종류(ctaIncluded)를 함께 반환하라.
JSON 스키마로만 응답:
{ "body": string, "ctaIncluded": { "comment": boolean, "share": boolean, "save": boolean, "tag": boolean, "follow": boolean } }
`.trim();

  return runClaudeJson(prompt, ReelsBodyResult, {
    system: loadReelsRules(),
    images: input.sourceImages,
    retries: 2,
  });
}
