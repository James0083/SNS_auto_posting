export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { isInsideDataRoot, normalizePath } from "@/lib/paths";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// ./data 내부 파일만 서빙한다. 경로 탈출 방지 + 한글 경로 NFC 정규화(원 문서 7-23과 동일한 함정 방어).
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("path");
  if (!raw) return NextResponse.json({ error: "path가 필요합니다." }, { status: 400 });

  const normalized = normalizePath(raw);
  if (!isInsideDataRoot(normalized)) {
    return NextResponse.json({ error: "접근할 수 없는 경로입니다." }, { status: 403 });
  }

  try {
    const buf = await fs.readFile(normalized);
    const ext = path.extname(normalized).toLowerCase();
    return new NextResponse(new Uint8Array(buf), {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }
}
