import { z } from "zod";

export const IgMode = z.enum(["auto", "experience", "branding"]);
export type IgMode = z.infer<typeof IgMode>;

export const IgSlide = z.object({
  query: z.string().min(1), // 이미지 생성용 장면 묘사 (한국어)
  role: z.enum(["cover", "body", "cta"]),
});

// 캐러셀 여부에 따라 slides 길이가 달라진다 — 호출부에서 min/max를 동적으로 검증한다.
export const IgCaptionResult = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()).max(30),
  slides: z.array(IgSlide).min(1),
});
export type IgCaptionResult = z.infer<typeof IgCaptionResult>;

export const IgPhotoSource = z.enum(["ai", "upload"]);
export type IgPhotoSource = z.infer<typeof IgPhotoSource>;

export const IgCaptionOnlyResult = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()).max(30),
});
export type IgCaptionOnlyResult = z.infer<typeof IgCaptionOnlyResult>;

export const IgJobInput = z.object({
  keyword: z.string().min(1),
  mode: IgMode,
  photoSource: IgPhotoSource.default("ai"),
  // photoSource가 "ai"일 때만 쓰인다. "upload"면 업로드한 사진 장수가 곧 slide 수가 된다.
  carouselEnabled: z.boolean().default(false),
  carouselCount: z.number().int().min(2).max(10).default(4),
  imageStyle: z.enum(["photo", "illust"]).default("photo"),
});
export type IgJobInput = z.infer<typeof IgJobInput>;
