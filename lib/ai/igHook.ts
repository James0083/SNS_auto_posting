import { runClaudeJson } from "@/lib/claude";
import { loadCaptionVoice } from "@/lib/ai/captionVoice";
import { IgHookResult } from "@/lib/types/ig";

// 캡션 첫 줄로 쓸 후킹 문구 후보 3개. lib/ai/reelsHook.ts와 같은 패턴이지만
// 인스타그램 피드 캡션 톤(caption-voice.md)을 따른다.
//
// ⚠️ input.context는 반드시 "이미 완성된 캡션 텍스트"여야 한다 — 키워드나 원문만 주고
// 캡션과 별개로 상상해서 만들게 하면, 캡션이 실제로 다루는 내용과 다른 제목이 나온다
// (레퍼런스 없이 키워드만으로 생성할 때 실제로 발생했던 버그).
export async function generateIgHookTitles(input: {
  context: string;
  sourceImages?: string[];
}) {
  const prompt = `
아래는 이미 완성된 인스타그램 게시물 캡션이다. 이 캡션의 "첫 줄(훅)"로 바꿔 쓸 수 있는
후킹 문구 후보 3개를 만들어라.

가장 중요한 규칙: 반드시 이 캡션이 실제로 다루는 구체적인 내용·소재·핵심 메시지를
그대로 반영해야 한다. 캡션에 없는 사실이나 다른 소재를 지어내거나, 원래 주제에서
벗어난 일반적인 후킹 문구를 만들지 않는다.

후킹 우선순위: ① 반전 ② 놀라운 숫자 ③ 질문 ④ 일상적인 것과 뜻밖의 결과 대비 ⑤ 예상 밖의 사실
주제를 그대로 반복하는 밋밋한 문구("OO에 대해 알아보겠습니다" 등)는 만들지 않는다.
문체·톤은 시스템 프롬프트의 "인스타그램 게시물 캡션 — 말투·톤 가이드"를 따른다. 완결된 한두 문장으로 쓴다.

캡션:
${input.context}

JSON 스키마로만 응답: { "candidates": [string, string, string] }
`.trim();

  return runClaudeJson(prompt, IgHookResult, {
    system: loadCaptionVoice(),
    images: input.sourceImages,
    retries: 2,
  });
}
