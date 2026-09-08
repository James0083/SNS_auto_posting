export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { REELS_IMAGE_DIR } from "@/lib/paths";
import { runReelsJob } from "@/lib/pipeline/reels";

export async function GET() {
  const rows = getDb().prepare("SELECT * FROM reels_jobs ORDER BY id DESC LIMIT 30").all();
  return NextResponse.json({ jobs: rows });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const sourceText = (form.get("sourceText") as string | null)?.trim() || undefined;
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  if (!sourceText && files.length === 0) {
    return NextResponse.json(
      { error: "원본 텍스트 또는 이미지 중 최소 1개는 필요합니다." },
      { status: 400 },
    );
  }

  const db = getDb();
  const inProgress = db
    .prepare("SELECT id FROM reels_jobs WHERE status IN ('pending','generating') LIMIT 1")
    .get();
  if (inProgress) {
    return NextResponse.json({ error: "이미 진행 중인 릴스 작업이 있습니다." }, { status: 409 });
  }

  const inputType = sourceText && files.length ? "both" : sourceText ? "text" : "image";

  const result = db
    .prepare(
      "INSERT INTO reels_jobs (input_type, source_text, source_image_paths_json) VALUES (?, ?, '[]')",
    )
    .run(inputType, sourceText ?? null);
  const jobId = Number(result.lastInsertRowid);

  if (files.length) {
    const sourceDir = path.join(REELS_IMAGE_DIR, String(jobId), "source");
    await fs.mkdir(sourceDir, { recursive: true });

    const savedPaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const ext = path.extname(file.name) || ".jpg";
      const outPath = path.join(sourceDir, `original_${i + 1}${ext}`);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(outPath, buf);
      savedPaths.push(outPath);
    }
    db.prepare("UPDATE reels_jobs SET source_image_paths_json = ? WHERE id = ?").run(
      JSON.stringify(savedPaths),
      jobId,
    );
  }

  runReelsJob(jobId).catch((e) => console.error("runReelsJob error", e));

  return NextResponse.json({ id: jobId }, { status: 201 });
}
