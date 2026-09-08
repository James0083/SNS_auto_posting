import { runClaudeJson } from "@/lib/claude";
import { getSettings } from "@/lib/settings";
import { IgCaptionResult, IgCaptionOnlyResult, type IgMode } from "@/lib/types/ig";

const MODE_GUIDE: Record<IgMode, string> = {
  auto: "최근 관심이 높은 트렌드를 소개하는 정보성 게시물. 흥미로운 사실이나 팁 위주로 작성.",
  experience: "1인칭 체험/방문 후기체(\"저는~\", \"~했어요\"). 실용 정보(가는 법, 가격, 팁 등)를 자연스럽게 녹인다.",
  branding: "전문가체(\"~입니다\"). 신뢰감 있는 톤으로 권위·실적을 짧게 언급하고 핵심 조언을 준다.",
};

export async function generateIgCaption(input: {
  keyword: string;
  mode: IgMode;
  slideCount: number; // carousel이 꺼져 있으면 1
}): Promise<{ ok: true; data: IgCaptionResult } | { ok: false; error: string }> {
  const settings = getSettings();

  const prompt = `
주제: "${input.keyword}"
글 성격: ${MODE_GUIDE[input.mode]}

Instagram 게시물용 캡션과 이미지 자리를 작성하라.

규칙:
- 캡션 첫 1~2줄에 가장 흥미로운 내용을 배치한다 (인스타그램 피드에서 "더보기"로 잘리기 전에 보이는 부분이라 가장 중요하다).
- 캡션은 짧고 리듬감 있게, 마크다운 기호(*, #, >, 백틱, - 목록)는 절대 쓰지 않는다.
- 해시태그는 최대 ${settings.igHashtagMax}개, 주제와 직접 관련된 것만 고른다.
- slides 배열은 정확히 ${input.slideCount}개를 만든다.
  - 배열 길이가 1이면 role은 "cover" 하나만.
  - 배열 길이가 2 이상이면 첫 번째는 "cover", 마지막은 "cta", 나머지는 "body".
  - 각 슬라이드의 query는 그 자리에 어떤 사진이 와야 하는지 한국어로 구체적으로 묘사한다(사람 얼굴이 주인공이 아닌 사물·풍경·클로즈업 위주).

아래 JSON 스키마로만 응답하라:
{ "caption": string, "hashtags": string[], "slides": [{ "query": string, "role": "cover"|"body"|"cta" }] }
`.trim();

  const res = await runClaudeJson(prompt, IgCaptionResult, { retries: 2 });
  if (!res.ok) return res;

  if (res.data.slides.length !== input.slideCount) {
    return {
      ok: false,
      error: `이미지 자리 개수가 요청과 다릅니다 (요청 ${input.slideCount}, 응답 ${res.data.slides.length}).`,
    };
  }
  if (res.data.hashtags.length > settings.igHashtagMax) {
    res.data.hashtags = res.data.hashtags.slice(0, settings.igHashtagMax);
  }

  return res;
}

// 사용자가 직접 촬영한 사진을 올리는 경우(photoSource="upload")에 쓴다.
// 이미지는 이미 있으므로 "어떤 사진이 필요한지"(slides.query)를 지어낼 필요가 없다 —
// 캡션·해시태그만 생성한다. 슬라이드 역할(cover/body/cta)은 호출부에서 업로드 순서로 정한다.
export async function generateIgCaptionForUpload(input: {
  keyword: string;
  mode: IgMode;
  photoCount: number;
  sourceImages: string[];
}): Promise<{ ok: true; data: IgCaptionOnlyResult } | { ok: false; error: string }> {
  const settings = getSettings();

  const prompt = `
주제: "${input.keyword}"
글 성격: ${MODE_GUIDE[input.mode]}

첨부된 사진 ${input.photoCount}장은 사용자가 직접 촬영한 것이며 그대로 게시된다.
이 사진들을 참고해 Instagram 게시물용 캡션과 해시태그를 작성하라.

규칙:
- 캡션 첫 1~2줄에 가장 흥미로운 내용을 배치한다 (인스타그램 피드에서 "더보기"로 잘리기 전에 보이는 부분이라 가장 중요하다).
- 캡션은 짧고 리듬감 있게, 마크다운 기호(*, #, >, 백틱, - 목록)는 절대 쓰지 않는다.
- 해시태그는 최대 ${settings.igHashtagMax}개, 주제와 사진 내용에 직접 관련된 것만 고른다.

아래 JSON 스키마로만 응답하라:
{ "caption": string, "hashtags": string[] }
`.trim();

  const res = await runClaudeJson(prompt, IgCaptionOnlyResult, {
    images: input.sourceImages,
    retries: 2,
  });
  if (!res.ok) return res;

  if (res.data.hashtags.length > settings.igHashtagMax) {
    res.data.hashtags = res.data.hashtags.slice(0, settings.igHashtagMax);
  }
  return res;
}
