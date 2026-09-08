import fs from "node:fs";
import path from "node:path";

// 콘텐츠 규칙 문서는 요약하지 말고 원문 그대로 시스템 프롬프트에 삽입한다
// (docs/PROJECT_PLAN.md 10-신규 원칙). 별도로 파싱·재구성하지 않고 파일을 그대로 읽는다.
let cached: string | null = null;

export function loadReelsRules(): string {
  if (cached) return cached;
  const rulesPath = path.resolve(process.cwd(), "docs/reference/reels-adaptation-rules.md");
  cached = fs.readFileSync(rulesPath, "utf-8");
  return cached;
}
