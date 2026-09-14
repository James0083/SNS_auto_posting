export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildZipBuffer, type ZipEntry } from "@/lib/text/zipExport";

type IgPostRow = { id: number; caption: string | null };
type IgImageRow = { local_path: string; slide_index: number; composited_path: string | null };
type IgTitleRow = { text: string };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const db = getDb();

  const job = db.prepare("SELECT * FROM ig_posts WHERE id = ?").get(jobId) as
    | IgPostRow
    | undefined;
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const images = db
    .prepare(
      "SELECT * FROM ig_images WHERE ig_post_id = ? AND verdict_ok = 1 ORDER BY slide_index ASC",
    )
    .all(jobId) as IgImageRow[];
  const chosenTitle = db
    .prepare("SELECT text FROM ig_titles WHERE ig_post_id = ? AND chosen = 1")
    .get(jobId) as IgTitleRow | undefined;

  const captionText = chosenTitle
    ? [chosenTitle.text, "", job.caption ?? ""].join("\n")
    : (job.caption ?? "");

  const entries: ZipEntry[] = [{ content: captionText, name: "caption.txt" }];
  images.forEach((img, i) => {
    entries.push({ path: img.local_path, name: `slide_${i + 1}.jpg` });
    if (img.composited_path) {
      entries.push({ path: img.composited_path, name: `slide_${i + 1}_composited.jpg` });
    }
  });

  const zip = await buildZipBuffer(entries);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ig_post_${jobId}.zip"`,
    },
  });
}
