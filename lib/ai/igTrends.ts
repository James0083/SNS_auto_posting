import { runClaudeJson } from "@/lib/claude";
import { IgTrendResult, type IgMode } from "@/lib/types/ig";

const MODE_FOCUS: Record<IgMode, string> = {
  auto: "최근 화제성이 높은 정보성 소재(트렌드 아이템, 신조어, 유행하는 장소·제품·현상 등)",
  experience: "요즘 사람들이 실제로 많이 찾아가거나 체험하는 장소·서비스(맛집, 카페, 여행지, 클래스 등)",
  branding: "요즘 해당 분야 전문가·브랜드 계정들이 자주 다루는 화제(업계 이슈, 자주 나오는 질문 등)",
};

// "자동으로 발굴"의 실제 구현부. claude -p에 WebSearch 도구 사용을 명시적으로 허용해
// 모델이 실제로 검색한 결과만 근거로 쓰게 한다 — 검색 없이 추측한 트렌드를 답하지 않도록
// 프롬프트에서도 강하게 지시한다(docs/PROJECT_PLAN.md 8-1 "추측 금지, 증거로 확인" 원칙).
export async function generateTrendKeywords(
  mode: IgMode,
): Promise<{ ok: true; data: IgTrendResult } | { ok: false; error: string }> {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const prompt = `
오늘은 ${today}이다.

너는 한국 인스타그램 게시물의 소재를 발굴하는 리서처다.
반드시 WebSearch 도구로 실제 웹 검색을 실행해서 확인한 사실만 근거로 삼아라.
검색하지 않고 알고 있는 지식만으로 추측한 트렌드를 답하지 마라 — 오래된 정보일 수 있다.

찾아야 할 소재 성격: ${MODE_FOCUS[mode]}

지금 검색으로 확인 가능한, 서로 다른 소재의 키워드 후보를 4개 만들어라.
각 후보마다:
- keyword: Instagram 게시물 "주제/키워드" 입력칸에 그대로 넣을 수 있는 짧은 한국어 문구 (예: "제주도 흑돼지 맛집", "무드등 홈카페")
- reason: 검색으로 확인한 근거를 한 문장으로 (왜 지금 다룰 만한지)

JSON 스키마로만 응답하라:
{ "keywords": [ { "keyword": string, "reason": string } ] }
`.trim();

  return runClaudeJson(prompt, IgTrendResult, {
    allowedTools: ["WebSearch"],
    retries: 1,
  });
}
