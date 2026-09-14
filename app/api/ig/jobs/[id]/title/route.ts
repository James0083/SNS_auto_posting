export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// 후킹 제목 3안 중 사용자가 고른 것을 저장한다 (복사·다운로드에 사용).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const body = await req.json().catch(() => null);
  const candidateIndex = body?.candidateIndex;

  if (typeof candidateIndex !== "number") {
    return NextResponse.json({ error: "candidateIndex가 필요합니다." }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE ig_titles SET chosen = 0 WHERE ig_post_id = ?").run(jobId);
  const result = db
    .prepare("UPDATE ig_titles SET chosen = 1 WHERE ig_post_id = ? AND candidate_index = ?")
    .run(jobId, candidateIndex);

  if (result.changes === 0) {
    return NextResponse.json({ error: "해당 제목 후보를 찾지 못했습니다." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
