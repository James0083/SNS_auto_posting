export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { IgMode } from "@/lib/types/ig";
import { generateTrendKeywords } from "@/lib/ai/igTrends";

// DB에 아무것도 남기지 않는 1회성 조회 라우트다 — 잡(job)이 아니라 버튼을 누를 때만 실행되고,
// 결과는 화면에서 "주제/키워드" 입력칸을 채우는 제안일 뿐이다(사용자가 최종 확인 후 생성 버튼을 눌러야
// 실제 캡션·이미지 생성이 시작된다).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsedMode = IgMode.safeParse(body?.mode);
  const mode = parsedMode.success ? parsedMode.data : "auto";

  const res = await generateTrendKeywords(mode);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 502 });
  }
  return NextResponse.json({ keywords: res.data.keywords });
}
