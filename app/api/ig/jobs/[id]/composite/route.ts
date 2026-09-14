export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { IG_IMAGE_DIR } from "@/lib/paths";

// 이미지 편집기(로고·그라데이션·제목 합성) 결과를 저장한다.
// 원본(local_path)은 건드리지 않고, 합성본을 별도 파일로 추가 저장한다 —
// 다운로드 zip에 원본과 합성본을 둘 다 담기 위함(regenerateIgImages와 달리 덮어쓰지 않음).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);

  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  const slideIndex = Number(form?.get("slideIndex"));

  if (!(file instanceof File) || file.size === 0 || !Number.isInteger(slideIndex)) {
    return NextResponse.json({ error: "image와 slideIndex가 필요합니다." }, { status: 400 });
  }

  const db = getDb();
  const row = db
    .prepare("SELECT id FROM ig_images WHERE ig_post_id = ? AND slide_index = ?")
    .get(jobId, slideIndex) as { id: number } | undefined;
  if (!row) {
    return NextResponse.json({ error: "해당 슬라이드를 찾지 못했습니다." }, { status: 404 });
  }

  const outPath = path.join(IG_IMAGE_DIR, String(jobId), `slide_${slideIndex + 1}_composited.jpg`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, Buffer.from(await file.arrayBuffer()));

  db.prepare("UPDATE ig_images SET composited_path = ? WHERE id = ?").run(outPath, row.id);

  return NextResponse.json({ ok: true });
}
