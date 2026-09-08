import { runClaudeJson } from "@/lib/claude";
import { loadReelsRules } from "@/lib/ai/reelsRules";
import { ReelsHookResult } from "@/lib/types/reels";

export async function generateHookTitles(input: { sourceText?: string; sourceImages?: string[] }) {
  const prompt = `
아래 원문을 참고해 한국어 후킹 제목 후보 3개를 만들어라.
우선순위: ① 반전 ② 놀라운 숫자 ③ 질문 ④ 일상적인 것과 놀라운 결과의 대비 ⑤ 인간이 예상하기 어려운 현상
원문 제목을 직역하지 말고 완전히 새로운 한국어 후킹 문구로 재구성한다.

${input.sourceText ? `원문 텍스트:\n${input.sourceText}` : "원문 텍스트 없음 — 첨부된 이미지의 시각 정보를 참고하라."}

JSON 스키마로만 응답: { "candidates": [string, string, string] }
`.trim();

  return runClaudeJson(prompt, ReelsHookResult, {
    system: loadReelsRules(),
    images: input.sourceImages,
    retries: 2,
  });
}
