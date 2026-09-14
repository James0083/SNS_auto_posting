export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { regenerateIgImages, regenerateIgTitles } from "@/lib/pipeline/ig";

const PARTS = ["image", "titles"] as const;
type Part = (typeof PARTS)[number];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = Number(id);
  const body = await req.json().catch(() => null);
  const part = body?.part as Part | undefined;

  if (!part || !PARTS.includes(part)) {
    return NextResponse.json({ error: "part는 image|titles 중 하나여야 합니다." }, { status: 400 });
  }

  const ok = part === "titles" ? await regenerateIgTitles(jobId) : await regenerateIgImages(jobId);
  return NextResponse.json({ ok });
}
