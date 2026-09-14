import { z } from "zod";

export const IgMode = z.enum(["auto", "experience", "branding"]);
export type IgMode = z.infer<typeof IgMode>;

export const IgSlide = z.object({
  // FLUX(이미지 생성 모델)용 영어 프롬프트. 한국어를 그대로 넘기면 모델이 잘 이해하지 못해
  // 캡션 내용과 무관한 이미지가 나오기 쉽다 — buildImagePrompt가 이 문자열에 스타일 토큰만
  // 붙여 그대로 사용하므로 반드시 영어, FLUX가 이해할 수 있는 구체적 장면 묘사여야 한다.
  query: z.string().min(1),
  role: z.enum(["cover", "body", "cta"]),
});

// 캐러셀 여부에 따라 slides 길이가 달라진다 — 호출부에서 min/max를 동적으로 검증한다.
// 해시태그는 생성하지 않는다(사용자 요청) — caption/slides만 받는다.
export const IgCaptionResult = z.object({
  caption: z.string().min(1),
  slides: z.array(IgSlide).min(1),
});
export type IgCaptionResult = z.infer<typeof IgCaptionResult>;

export const IgPhotoSource = z.enum(["ai", "upload"]);
export type IgPhotoSource = z.infer<typeof IgPhotoSource>;

export const IgCaptionOnlyResult = z.object({
  caption: z.string().min(1),
});
export type IgCaptionOnlyResult = z.infer<typeof IgCaptionOnlyResult>;

export const IgTrendKeyword = z.object({
  keyword: z.string().min(1), // 게시물 "주제/키워드" 입력칸에 그대로 채워질 값
  reason: z.string().min(1), // 왜 지금 트렌드인지 — 실제 웹 검색으로 확인한 근거를 한 문장으로
});
export type IgTrendKeyword = z.infer<typeof IgTrendKeyword>;

export const IgTrendResult = z.object({
  keywords: z.array(IgTrendKeyword).min(3).max(5),
});
export type IgTrendResult = z.infer<typeof IgTrendResult>;

// 캡션 첫 줄로 쓸 후킹 문구 후보 3개.
export const IgHookResult = z.object({
  candidates: z.array(z.string().min(1)).length(3),
});
export type IgHookResult = z.infer<typeof IgHookResult>;

// 'keyword' = 주제/키워드로 새로 생성, 'adapt' = 해외 원문을 각색
export const IgContentSource = z.enum(["keyword", "adapt"]);
export type IgContentSource = z.infer<typeof IgContentSource>;

// 배치의 모든 항목에 공통으로 적용되는 옵션 (한 번만 설정).
export const IgBatchShared = z.object({
  contentSource: IgContentSource.default("keyword"),
  mode: IgMode,
  photoSource: IgPhotoSource.default("ai"),
  // photoSource가 "ai"일 때만 쓰인다. "upload"면 업로드한 사진 장수가 곧 slide 수가 된다.
  // contentSource가 "adapt"이면 항상 "ai"로 취급한다.
  carouselEnabled: z.boolean().default(false),
  carouselCount: z.number().int().min(2).max(10).default(4),
  imageStyle: z.enum(["photo", "illust"]).default("photo"),
});
export type IgBatchShared = z.infer<typeof IgBatchShared>;
