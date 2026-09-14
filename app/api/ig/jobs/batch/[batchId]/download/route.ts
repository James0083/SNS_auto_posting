export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildZipBuffer, type ZipEntry } from "@/lib/text/zipExport";

type IgPostRow = { id: number; keyword: string; caption: string | null };
type IgImageRow = { local_path: string; slide_index: number; composited_path: string | null };
type IgTitleRow = { text: string };

export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const db = getDb();

  const jobs = db
    .prepare("SELECT * FROM ig_posts WHERE batch_id = ? ORDER BY id ASC")
    .all(batchId) as IgPostRow[];
  if (jobs.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const entries: ZipEntry[] = [];
  for (const job of jobs) {
    const images = db
      .prepare(
        "SELECT * FROM ig_images WHERE ig_post_id = ? AND verdict_ok = 1 ORDER BY slide_index ASC",
      )
      .all(job.id) as IgImageRow[];
    const chosenTitle = db
      .prepare("SELECT text FROM ig_titles WHERE ig_post_id = ? AND chosen = 1")
      .get(job.id) as IgTitleRow | undefined;
    const captionText = chosenTitle
      ? [chosenTitle.text, "", job.caption ?? ""].join("\n")
      : (job.caption ?? "");

    const folder = `job_${job.id}`;
    entries.push({ content: captionText, name: `${folder}/caption.txt` });
    images.forEach((img, i) => {
      entries.push({ path: img.local_path, name: `${folder}/slide_${i + 1}.jpg` });
      if (img.composited_path) {
        entries.push({ path: img.composited_path, name: `${folder}/slide_${i + 1}_composited.jpg` });
      }
    });
  }

  const zip = await buildZipBuffer(entries);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ig_batch_${batchId.slice(0, 8)}.zip"`,
    },
  });
}
