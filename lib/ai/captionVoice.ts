import fs from "node:fs";
import path from "node:path";

// 캡션 말투·톤 가이드는 요약하지 말고 원문 그대로 시스템 프롬프트에 삽입한다
// (lib/ai/reelsRules.ts와 동일한 패턴). 파싱·재구성하지 않고 파일을 그대로 읽는다.
let cached: string | null = null;

export function loadCaptionVoice(): string {
  if (cached) return cached;
  const rulesPath = path.resolve(process.cwd(), "docs/reference/caption-voice.md");
  cached = fs.readFileSync(rulesPath, "utf-8");
  return cached;
}
