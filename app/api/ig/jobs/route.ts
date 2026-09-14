export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { IgBatchShared } from "@/lib/types/ig";
import { IG_IMAGE_DIR } from "@/lib/paths";
import { runIgJob } from "@/lib/pipeline/ig";
import { enqueueJob } from "@/lib/pipeline/queue";

export async function GET(req: NextRequest) {
  const batchId = req.nextUrl.searchParams.get("batch");
  const db = getDb();
  const rows = batchId
    ? db.prepare("SELECT * FROM ig_posts WHERE batch_id = ? ORDER BY id ASC").all(batchId)
    : db.prepare("SELECT * FROM ig_posts ORDER BY id DESC LIMIT 30").all();
  return NextResponse.json({ jobs: rows });
}

type ParsedItem = { keyword?: string; sourceText?: string; files: File[] };

function firstLineLabel(text: string): string {
  const line = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  return line.length > 30 ? `${line.slice(0, 30)}…` : line || "해외 콘텐츠 각색";
}

async function saveItemImages(jobId: number, files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const sourceDir = path.join(IG_IMAGE_DIR, String(jobId), "source");
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

  const shared = IgBatchShared.safeParse({
    contentSource: form.get("contentSource") ?? "keyword",
    mode: form.get("mode"),
    photoSource: form.get("photoSource") ?? "ai",
    carouselEnabled: form.get("carouselEnabled") === "true",
    carouselCount: Number(form.get("carouselCount") ?? 4),
    imageStyle: form.get("imageStyle") ?? "photo",
  });
  if (!shared.success) {
    return NextResponse.json({ error: shared.error.message }, { status: 400 });
  }
  const opts = shared.data;
  const isAdapt = opts.contentSource === "adapt";
  const effectivePhotoSource = isAdapt ? "ai" : opts.photoSource;

  const count = Number(form.get("count") ?? 0);
  const { batchMax } = getSettings();
  if (!Number.isInteger(count) || count < 1) {
    return NextResponse.json({ error: "생성할 항목이 없습니다." }, { status: 400 });
  }
  if (count > batchMax) {
    return NextResponse.json(
      { error: `한 번에 최대 ${batchMax}건까지 생성할 수 있습니다.` },
      { status: 400 },
    );
  }

  const items: ParsedItem[] = [];
  for (let i = 0; i < count; i++) {
    const files = form
      .getAll(`images_${i}`)
      .filter((f): f is File => f instanceof File && f.size > 0);
    const keyword = (form.get(`keyword_${i}`) as string | null)?.trim() || undefined;
    const sourceText = (form.get(`sourceText_${i}`) as string | null)?.trim() || undefined;

    if (isAdapt) {
      if (!sourceText && files.length === 0) {
        return NextResponse.json(
          { error: `${i + 1}번 항목: 원문 텍스트나 이미지 중 하나는 필요합니다.` },
          { status: 400 },
        );
      }
    } else if (!keyword) {
      return NextResponse.json(
        { error: `${i + 1}번 항목: 주제/키워드를 입력해주세요.` },
        { status: 400 },
      );
    } else if (effectivePhotoSource === "upload" && files.length === 0) {
      return NextResponse.json(
        { error: `${i + 1}번 항목: 직접 촬영한 사진을 최소 1장 올려주세요.` },
        { status: 400 },
      );
    }

    items.push({ keyword, sourceText, files });
  }

  const db = getDb();
  const batchId = items.length > 1 ? crypto.randomUUID() : null;
  const ids: number[] = [];

  for (const item of items) {
    const slideCount = isAdapt
      ? opts.carouselEnabled
        ? opts.carouselCount
        : 1
      : effectivePhotoSource === "upload"
        ? item.files.length
        : opts.carouselEnabled
          ? opts.carouselCount
          : 1;
    const carousel = slideCount > 1 ? 1 : 0;
    const label = isAdapt
      ? item.sourceText
        ? firstLineLabel(item.sourceText)
        : "이미지 각색"
      : item.keyword!;

    const result = db
      .prepare(
        `INSERT INTO ig_posts
           (keyword, mode, carousel, slide_count, image_style, photo_source, content_source, source_text, batch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        label,
        opts.mode,
        carousel,
        slideCount,
        opts.imageStyle,
        effectivePhotoSource,
        opts.contentSource,
        isAdapt ? (item.sourceText ?? null) : null,
        batchId,
      );
    const jobId = Number(result.lastInsertRowid);

    const savedPaths = await saveItemImages(jobId, item.files);
    if (savedPaths.length) {
      db.prepare("UPDATE ig_posts SET source_image_paths_json = ? WHERE id = ?").run(
        JSON.stringify(savedPaths),
        jobId,
      );
    }

    ids.push(jobId);
    enqueueJob(() => runIgJob(jobId));
  }

  return NextResponse.json({ batchId, ids }, { status: 201 });
}
