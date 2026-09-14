export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { REELS_IMAGE_DIR } from "@/lib/paths";
import { runReelsJob } from "@/lib/pipeline/reels";
import { enqueueJob } from "@/lib/pipeline/queue";

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batch");
  const db = getDb();
  const rows = batchId
    ? db.prepare("SELECT * FROM reels_jobs WHERE batch_id = ? ORDER BY id ASC").all(batchId)
    : db.prepare("SELECT * FROM reels_jobs ORDER BY id DESC LIMIT 30").all();
  return NextResponse.json({ jobs: rows });
}

async function saveItemImages(jobId: number, files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const sourceDir = path.join(REELS_IMAGE_DIR, String(jobId), "source");
  await fs.mkdir(sourceDir, { recursive: true });
  const saved: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const ext = path.extname(file.name) || ".jpg";
    const outPath = path.join(sourceDir, `original_${i + 1}${ext}`);
    await fs.writeFile(outPath, Buffer.from(await file.arrayBuffer()));
    saved.push(outPath);
  }
  return saved;
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const count = Number(form.get("count") ?? 0);
  const { batchMax } = getSettings();
  if (!Number.isInteger(count) || count < 1) {
    return NextResponse.json({ error: "각색할 항목이 없습니다." }, { status: 400 });
  }
  if (count > batchMax) {
    return NextResponse.json(
      { error: `한 번에 최대 ${batchMax}건까지 각색할 수 있습니다.` },
      { status: 400 },
    );
  }

  const items: { sourceText?: string; files: File[] }[] = [];
  for (let i = 0; i < count; i++) {
    const sourceText = (form.get(`sourceText_${i}`) as string | null)?.trim() || undefined;
    const files = form
      .getAll(`images_${i}`)
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (!sourceText && files.length === 0) {
      return NextResponse.json(
        { error: `${i + 1}번 항목: 원문 텍스트나 이미지 중 하나는 필요합니다.` },
        { status: 400 },
      );
    }
    items.push({ sourceText, files });
  }

  const db = getDb();
  const batchId = items.length > 1 ? crypto.randomUUID() : null;
  const ids: number[] = [];

  for (const item of items) {
    const inputType =
      item.sourceText && item.files.length ? "both" : item.sourceText ? "text" : "image";
    const result = db
      .prepare(
        "INSERT INTO reels_jobs (input_type, source_text, source_image_paths_json, batch_id) VALUES (?, ?, '[]', ?)",
      )
      .run(inputType, item.sourceText ?? null, batchId);
    const jobId = Number(result.lastInsertRowid);

    const savedPaths = await saveItemImages(jobId, item.files);
    if (savedPaths.length) {
      db.prepare("UPDATE reels_jobs SET source_image_paths_json = ? WHERE id = ?").run(
        JSON.stringify(savedPaths),
        jobId,
      );
    }

    ids.push(jobId);
    enqueueJob(() => runReelsJob(jobId));
  }

  return NextResponse.json({ batchId, ids }, { status: 201 });
}
