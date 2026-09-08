// CLAUDE.md 19장 체크리스트 중 "기계적으로 검증 가능한 항목"만 자동화한다.
// 나머지(후킹 강도, 문체 톤, 과학적 정확성 등)는 자동화 대상이 아니며,
// 화면에서 사람이 직접 확인하는 체크박스로 남겨야 한다
// (docs/PROJECT_PLAN.md 7-3 "직접 확인하지 않은 것을 됨이라고 쓰지 마라" 원칙).
export type ReelsQcResult = {
  noHashtags: boolean;
  hasBoldMarker: boolean;
};

// 본문은 저장 전에 이미 boldConvert.ts를 거치므로, 라틴/숫자 강조는 마크다운(**)이 아니라
// 유니코드 수학 알파벳 기호(U+1D400~U+1D7FF)로 바뀌어 있다. 둘 다 감지한다
// (한글 강조는 애초에 표현 불가하므로 이 체크로 잡히지 않는다 — MANUAL_QC_ITEMS로 사람이 확인).
const UNICODE_BOLD_RE = /[\u{1D400}-\u{1D7FF}]/u;
const MARKDOWN_BOLD_RE = /\*\*[^*]+\*\*/;

export function runAutomatedQc(body: string): ReelsQcResult {
  return {
    noHashtags: !/#[^\s#]+/.test(body),
    hasBoldMarker: UNICODE_BOLD_RE.test(body) || MARKDOWN_BOLD_RE.test(body),
  };
}

// 사람이 화면에서 직접 확인해야 하는 항목 (자동 검증 불가) — UI 체크박스 라벨로 사용.
export const MANUAL_QC_ITEMS = [
  "첫 문장이 충분히 후킹되는가",
  "평서문은 ~습니다체가 중심이고 구어체가 과하지 않은가",
  "원문의 핵심 사실·수치가 왜곡 없이 유지됐는가",
  "위험/민감 소재라면 안전 경고가 포함됐는가",
  "CTA 문구가 격식체를 유지했는가(반말 없음)",
] as const;
