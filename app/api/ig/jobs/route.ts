export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { IgJobInput } from "@/lib/types/ig";
import { IG_IMAGE_DIR } from "@/lib/paths";
import { runIgJob } from "@/lib/pipeline/ig";

export async function GET() {
  const rows = getDb().prepare("SELECT * FROM ig_posts ORDER BY id DESC LIMIT 30").all();
  return NextResponse.json({ jobs: rows });
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  const raw = {
    keyword: form.get("keyword"),
    mode: form.get("mode"),
    photoSource: form.get("photoSource") ?? "ai",
    carouselEnabled: form.get("carouselEnabled") === "true",
    carouselCount: Number(form.get("carouselCount") ?? 4),
    imageStyle: form.get("imageStyle") ?? "photo",
  };

  const parsed = IgJobInput.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const input = parsed.data;

  if (input.photoSource === "upload" && files.length === 0) {
    return NextResponse.json(
      { error: "직접 촬영한 사진을 최소 1장 업로드해주세요." },
      { status: 400 },
    );
  }

  const db = getDb();
  const inProgress = db
    .prepare("SELECT id FROM ig_posts WHERE status IN ('pending','generating') LIMIT 1")
    .get();
  if (inProgress) {
    return NextResponse.json(
      { error: "이미 진행 중인 인스타그램 게시물 작업이 있습니다." },
      { status: 409 },
    );
  }

  // photoSource="upload"면 업로드한 사진 장수가 곧 slide 수. "ai"면 캐러셀 설정을 따른다.
  const slideCount = input.photoSource === "upload" ? files.length : input.carouselEnabled ? input.carouselCount : 1;
  const carousel = slideCount > 1 ? 1 : 0;

  const result = db
    .prepare(
      `INSERT INTO ig_posts (keyword, mode, carousel, slide_count, image_style, photo_source)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(input.keyword, input.mode, carousel, slideCount, input.imageStyle, input.photoSource);

  const jobId = Number(result.lastInsertRowid);

  if (input.photoSource === "upload" && files.length) {
    const sourceDir = path.join(IG_IMAGE_DIR, String(jobId), "source");
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
    db.prepare("UPDATE ig_posts SET source_image_paths_json = ? WHERE id = ?").run(
      JSON.stringify(savedPaths),
      jobId,
    );
  }

  runIgJob(jobId).catch((e) => console.error("runIgJob error", e));

  return NextResponse.json({ id: jobId }, { status: 201 });
}
