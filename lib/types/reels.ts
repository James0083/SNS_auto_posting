import { z } from "zod";

export const ReelsHookResult = z.object({
  candidates: z.array(z.string().min(1)).length(3),
});
export type ReelsHookResult = z.infer<typeof ReelsHookResult>;

export const ReelsCtaIncluded = z.object({
  comment: z.boolean(),
  share: z.boolean(),
  save: z.boolean(),
  tag: z.boolean(),
  follow: z.boolean(),
});
export type ReelsCtaIncluded = z.infer<typeof ReelsCtaIncluded>;

export const ReelsBodyResult = z.object({
  body: z.string().min(1),
  ctaIncluded: ReelsCtaIncluded,
});
export type ReelsBodyResult = z.infer<typeof ReelsBodyResult>;

export const ReelsImagePromptResult = z.object({
  prompt: z.string().min(1), // 영문 FLUX 프롬프트
});
