export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getJobLogs } from "@/lib/log";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const db = getDb();

  const job = db.prepare("SELECT * FROM reels_jobs WHERE id = ?").get(jobId);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const titles = db
    .prepare("SELECT * FROM reels_titles WHERE reels_job_id = ? ORDER BY candidate_index ASC")
    .all(jobId);
  const draft = db
    .prepare("SELECT * FROM reels_drafts WHERE reels_job_id = ? ORDER BY id DESC LIMIT 1")
    .get(jobId);
  const image = db
    .prepare("SELECT * FROM reels_images WHERE reels_job_id = ? ORDER BY id DESC LIMIT 1")
    .get(jobId);
  const logs = getJobLogs("reels", jobId);

  return NextResponse.json({ job, titles, draft, image, logs });
}
