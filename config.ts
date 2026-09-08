export const DEV_PORT = 4123;

// 아래는 settings 테이블이 비어있을 때만 쓰이는 최초 기본값이다.
// 이후에는 항상 DB(runtime settings)가 우선한다 — lib/settings.ts 참고.
export const DEFAULT_SETTINGS = {
  claudeConcurrency: 2, // 1~6
  claudeTimeoutSec: 180, // 30~900
  imageCandidates: 10, // 3~20 (크롤링 이미지 후보 수 — 현재 트랙에서는 미사용, 네이버 트랙 대비 예약)
  cfImageSteps: 6, // 1~8
  igHashtagMax: 15, // 5~30
  carouselCountDefault: 4, // 2~10
  dailyGenerationLimit: 20, // 1~200, 비용 관리용 소프트 리밋 (계정 안전 목적 아님)
} as const;

export const SETTINGS_LIMITS: Record<string, { min: number; max: number }> = {
  claudeConcurrency: { min: 1, max: 6 },
  claudeTimeoutSec: { min: 30, max: 900 },
  imageCandidates: { min: 3, max: 20 },
  cfImageSteps: { min: 1, max: 8 },
  igHashtagMax: { min: 5, max: 30 },
  carouselCountDefault: { min: 2, max: 10 },
  dailyGenerationLimit: { min: 1, max: 200 },
};
