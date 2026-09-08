import fs from "node:fs";
import path from "node:path";

export const DATA_ROOT = path.resolve(process.cwd(), "data");
export const IG_IMAGE_DIR = path.join(DATA_ROOT, "instagram");
export const REELS_IMAGE_DIR = path.join(DATA_ROOT, "reels");
export const DB_PATH = path.join(DATA_ROOT, "app.db");

export function ensureDataDirs() {
  for (const dir of [DATA_ROOT, IG_IMAGE_DIR, REELS_IMAGE_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// /api/file 등에서 쓰는 안전한 절대경로 정규화.
// 한글 경로 NFC/NFD 문제(원 문서 7-23)와 윈도우 대소문자 문제를 함께 방어한다.
export function normalizePath(p: string): string {
  const resolved = path.resolve(p).normalize("NFC");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isInsideDataRoot(p: string): boolean {
  const normalizedRoot = normalizePath(DATA_ROOT) + path.sep;
  return normalizePath(p).startsWith(normalizedRoot);
}
