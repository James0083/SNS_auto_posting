export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getJobLogs } from "@/lib/log";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const db = getDb();

  const job = db.prepare("SELECT * FROM ig_posts WHERE id = ?").get(jobId);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  const images = db
    .prepare("SELECT * FROM ig_images WHERE ig_post_id = ? ORDER BY slide_index ASC")
    .all(jobId);
  const titles = db
    .prepare("SELECT * FROM ig_titles WHERE ig_post_id = ? ORDER BY candidate_index ASC")
    .all(jobId);
  const logs = getJobLogs("ig", jobId);

  return NextResponse.json({ job, images, titles, logs });
}
