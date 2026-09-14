export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildZipBuffer, type ZipEntry } from "@/lib/text/zipExport";

type ReelsJobRow = { id: number };
type ReelsTitleRow = { text: string };
type ReelsDraftRow = { body_text: string };
type ReelsImageRow = { local_path: string | null };

export async function GET(_req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const db = getDb();

  const jobs = db
    .prepare("SELECT id FROM reels_jobs WHERE batch_id = ? ORDER BY id ASC")
    .all(batchId) as ReelsJobRow[];
  if (jobs.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const entries: ZipEntry[] = [];
  for (const job of jobs) {
    const chosenTitle = db
      .prepare("SELECT text FROM reels_titles WHERE reels_job_id = ? AND chosen = 1")
      .get(job.id) as ReelsTitleRow | undefined;
    const draft = db
      .prepare("SELECT body_text FROM reels_drafts WHERE reels_job_id = ? ORDER BY id DESC LIMIT 1")
      .get(job.id) as ReelsDraftRow | undefined;
    const image = db
      .prepare(
        "SELECT local_path FROM reels_images WHERE reels_job_id = ? AND verdict_ok = 1 ORDER BY id DESC LIMIT 1",
      )
      .get(job.id) as ReelsImageRow | undefined;

    const folder = `job_${job.id}`;
    const textContent = [chosenTitle?.text ?? "", "", draft?.body_text ?? ""].join("\n");
    entries.push({ content: textContent, name: `${folder}/reels_script.txt` });
    if (image?.local_path) entries.push({ path: image.local_path, name: `${folder}/image.jpg` });
  }

  const zip = await buildZipBuffer(entries);
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="reels_batch_${batchId.slice(0, 8)}.zip"`,
    },
  });
}
