export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildZipBuffer } from "@/lib/text/zipExport";

type IgPostRow = { id: number; caption: string | null; hashtags_json: string | null };
type IgImageRow = { local_path: string; slide_index: number };

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

  const hashtags: string[] = job.hashtags_json ? JSON.parse(job.hashtags_json) : [];
  const captionText = [job.caption ?? "", "", hashtags.map((h) => `#${h}`).join(" ")].join("\n");

  const zip = await buildZipBuffer([
    { content: captionText, name: "caption.txt" },
    ...images.map((img, i) => ({ path: img.local_path, name: `slide_${i + 1}.jpg` })),
  ]);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ig_post_${jobId}.zip"`,
    },
  });
}
