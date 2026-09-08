export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildZipBuffer, type ZipEntry } from "@/lib/text/zipExport";

type ReelsTitleRow = { text: string };
type ReelsDraftRow = { body_text: string };
type ReelsImageRow = { local_path: string | null };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const db = getDb();

  const job = db.prepare("SELECT id FROM reels_jobs WHERE id = ?").get(jobId);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const chosenTitle = db
    .prepare("SELECT text FROM reels_titles WHERE reels_job_id = ? AND chosen = 1")
    .get(jobId) as ReelsTitleRow | undefined;
  const draft = db
    .prepare("SELECT body_text FROM reels_drafts WHERE reels_job_id = ? ORDER BY id DESC LIMIT 1")
    .get(jobId) as ReelsDraftRow | undefined;
  const image = db
    .prepare(
      "SELECT local_path FROM reels_images WHERE reels_job_id = ? AND verdict_ok = 1 ORDER BY id DESC LIMIT 1",
    )
    .get(jobId) as ReelsImageRow | undefined;

  const textContent = [chosenTitle?.text ?? "", "", draft?.body_text ?? ""].join("\n");

  const entries: ZipEntry[] = [{ content: textContent, name: "reels_script.txt" }];
  if (image?.local_path) entries.push({ path: image.local_path, name: "image.jpg" });

  const zip = await buildZipBuffer(entries);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="reels_${jobId}.zip"`,
    },
  });
}
