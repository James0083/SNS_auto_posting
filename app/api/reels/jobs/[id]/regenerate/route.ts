export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { regenerateTitles, regenerateBody, regenerateImage } from "@/lib/pipeline/reels";

const PARTS = ["titles", "body", "image"] as const;
type Part = (typeof PARTS)[number];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const body = await req.json().catch(() => null);
  const part = body?.part as Part | undefined;

  if (!part || !PARTS.includes(part)) {
    return NextResponse.json(
      { error: "part는 titles|body|image 중 하나여야 합니다." },
      { status: 400 },
    );
  }

  let ok = false;
  if (part === "titles") ok = await regenerateTitles(jobId);
  else if (part === "body") ok = await regenerateBody(jobId);
  else ok = await regenerateImage(jobId);

  return NextResponse.json({ ok });
}
