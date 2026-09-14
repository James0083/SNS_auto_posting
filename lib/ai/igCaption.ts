import { runClaudeJson } from "@/lib/claude";
import { loadCaptionVoice } from "@/lib/ai/captionVoice";
import { loadReelsRules } from "@/lib/ai/reelsRules";
import { IgCaptionResult, IgCaptionOnlyResult, type IgMode } from "@/lib/types/ig";

// 모드는 "소재와 관점"만 바꾼다. 말투(종결어미·격식체 등)는 caption-voice.md가 고정한다.
const MODE_GUIDE: Record<IgMode, string> = {
  auto: "최근 화제·트렌드를 소개하는 정보성 시점. 흥미로운 사실이나 팁 위주로 쓴다.",
  experience:
    "직접 방문·체험한 사람의 1인칭 시점(\"직접 가보니\", \"먹어보니\"). 가는 법·가격·팁 같은 실용 정보를 자연스럽게 녹인다.",
  branding:
    "해당 분야에 익숙한 사람의 시점. 신뢰감 있게 핵심 조언을 준다. 권위·실적은 짧게만 언급하고 홍보처럼 늘어놓지 않는다.",
};

// slides[].query 작성 규칙 — 캡션 내용과 무관한 이미지가 나오는 걸 막는 핵심 지침.
// 한국어로 받으면 FLUX가 잘 이해하지 못해 엉뚱한 사진이 나오므로 반드시 영어로 받는다.
function slideQueryRule(extra?: string): string {
  return `- 각 슬라이드의 query는 FLUX(이미지 생성 모델)에 바로 넣을 영어 프롬프트로 작성한다.
    - 지금 작성한 캡션에서 실제로 등장하는 구체적인 장면·사물·순간을 그대로 반영한다 — 캡션의 막연한 주제가 아니라 캡션 문장에 나온 구체적 디테일(사물, 행동, 배경)을 담아 캡션과 이미지가 같은 이야기를 하도록 만든다.
    - 피사체·구도·조명·배경·질감을 영어로 구체적으로 명시한다. 사람 얼굴이 주인공이 아닌 사물·풍경·클로즈업 위주로 구성한다.
    - 슬라이드가 2장 이상이면 색감·조명·스타일 톤을 슬라이드끼리 통일해 하나의 게시물처럼 보이게 한다.${extra ? `\n    - ${extra}` : ""}`;
}

export async function generateIgCaption(input: {
  keyword: string;
  mode: IgMode;
  slideCount: number; // carousel이 꺼져 있으면 1
}): Promise<{ ok: true; data: IgCaptionResult } | { ok: false; error: string }> {
  const prompt = `
주제: "${input.keyword}"
소재와 관점: ${MODE_GUIDE[input.mode]}

Instagram 게시물용 캡션과 이미지 자리를 작성하라.
문체·톤·구조는 시스템 프롬프트의 "인스타그램 게시물 캡션 — 말투·톤 가이드"를 그대로 따른다.

작업 규칙:
- 해시태그는 생성하지 않는다. 캡션 본문에도 절대 넣지 않는다.
- slides 배열은 정확히 ${input.slideCount}개를 만든다.
  - 배열 길이가 1이면 role은 "cover" 하나만.
  - 배열 길이가 2 이상이면 첫 번째는 "cover", 마지막은 "cta", 나머지는 "body".
${slideQueryRule()}

아래 JSON 스키마로만 응답하라:
{ "caption": string, "slides": [{ "query": string, "role": "cover"|"body"|"cta" }] }
`.trim();

  const res = await runClaudeJson(prompt, IgCaptionResult, {
    system: loadCaptionVoice(),
    retries: 2,
  });
  if (!res.ok) return res;

  if (res.data.slides.length !== input.slideCount) {
    return {
      ok: false,
      error: `이미지 자리 개수가 요청과 다릅니다 (요청 ${input.slideCount}, 응답 ${res.data.slides.length}).`,
    };
  }

  return res;
}

// 사용자가 직접 촬영한 사진을 올리는 경우(photoSource="upload")에 쓴다.
// 이미지는 이미 있으므로 "어떤 사진이 필요한지"(slides.query)를 지어낼 필요가 없다 — 캡션만 생성한다.
// 슬라이드 역할(cover/body/cta)은 호출부에서 업로드 순서로 정한다.
export async function generateIgCaptionForUpload(input: {
  keyword: string;
  mode: IgMode;
  photoCount: number;
  sourceImages: string[];
}): Promise<{ ok: true; data: IgCaptionOnlyResult } | { ok: false; error: string }> {
  const prompt = `
주제: "${input.keyword}"
소재와 관점: ${MODE_GUIDE[input.mode]}

첨부된 사진 ${input.photoCount}장은 사용자가 직접 촬영한 것이며 그대로 게시된다.
이 사진들을 참고해 Instagram 게시물용 캡션을 작성하라.
문체·톤·구조는 시스템 프롬프트의 "인스타그램 게시물 캡션 — 말투·톤 가이드"를 그대로 따른다.

작업 규칙:
- 사진에서 확인되는 내용과 어긋나는 서술을 하지 않는다.
- 해시태그는 생성하지 않는다. 캡션 본문에도 절대 넣지 않는다.

아래 JSON 스키마로만 응답하라:
{ "caption": string }
`.trim();

  return runClaudeJson(prompt, IgCaptionOnlyResult, {
    system: loadCaptionVoice(),
    images: input.sourceImages,
    retries: 2,
  });
}

// 해외 콘텐츠 각색(content_source="adapt")에 쓴다. 릴스 각색과 같은 원문 처리 원칙
// (직역 금지·수치/고유명사 보존·안전·광고/종교 프레이밍 제거·출처 일반화)을 적용하되,
// 결과물은 릴스 설명란이 아니라 "인스타그램 피드 게시물 캡션" 형식으로 만든다.
export async function generateIgCaptionFromSource(input: {
  sourceText?: string;
  sourceImages?: string[];
  slideCount: number; // carousel이 꺼져 있으면 1
}): Promise<{ ok: true; data: IgCaptionResult } | { ok: false; error: string }> {
  const prompt = `
아래 해외 SNS 원문을 한국어 Instagram 피드 게시물 캡션으로 번역·각색하라.

${
  input.sourceText
    ? `원문 텍스트:\n${input.sourceText}`
    : "원문 텍스트 없음 — 첨부된 이미지의 시각 정보를 주 소스로 구성하라."
}

형식 안내 (중요):
- 시스템 프롬프트에는 "릴스 각색 규칙"과 "캡션 말투·톤 가이드" 두 문서가 있다.
- 원문을 다루는 방식(직역 금지, 수치·고유명사·안전 경고 보존, 광고/종교/이념 프레이밍 제거, 신뢰도 낮은 출처 일반화)은 릴스 각색 규칙을 따른다.
- 단, 결과물의 형식·말투는 "캡션 말투·톤 가이드"를 따른다. 릴스 설명란 형식(코드 블록 출력, 본문과 별개의 후킹 제목 3안, 릴스 전용 구조)은 이 트랙에서 쓰지 않는다.
- 캡션은 첫 1~2줄에 훅을 배치하고, 짧은 문단으로 나누며, 마크다운 기호(*, #, >, 백틱, - 목록)를 쓰지 않는다.

작업 규칙:
- 해시태그는 생성하지 않는다. 캡션 본문에도 절대 넣지 않는다.
- slides 배열은 정확히 ${input.slideCount}개를 만든다.
  - 배열 길이가 1이면 role은 "cover" 하나만.
  - 배열 길이가 2 이상이면 첫 번째는 "cover", 마지막은 "cta", 나머지는 "body".
${slideQueryRule("원문 이미지 속 실존 인물·브랜드 로고·저작물은 그대로 재현하지 않고 컨셉만 일반화한다.")}

아래 JSON 스키마로만 응답하라:
{ "caption": string, "slides": [{ "query": string, "role": "cover"|"body"|"cta" }] }
`.trim();

  const res = await runClaudeJson(prompt, IgCaptionResult, {
    system: [loadReelsRules(), loadCaptionVoice()].join("\n\n---\n\n"),
    images: input.sourceImages,
    retries: 2,
  });
  if (!res.ok) return res;

  if (res.data.slides.length !== input.slideCount) {
    return {
      ok: false,
      error: `이미지 자리 개수가 요청과 다릅니다 (요청 ${input.slideCount}, 응답 ${res.data.slides.length}).`,
    };
  }

  return res;
}
