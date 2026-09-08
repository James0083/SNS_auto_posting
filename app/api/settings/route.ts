export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSetting, resetSettings, LIMITS } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/config";

export async function GET() {
  return NextResponse.json({ settings: getSettings(), limits: LIMITS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (body.reset) {
    resetSettings();
    return NextResponse.json({ settings: getSettings() });
  }

  for (const [key, value] of Object.entries(body)) {
    if (!(key in DEFAULT_SETTINGS)) {
      return NextResponse.json({ error: `알 수 없는 설정: ${key}` }, { status: 400 });
    }
    if (typeof value !== "number") {
      return NextResponse.json({ error: `${key}는 숫자여야 합니다.` }, { status: 400 });
    }
    setSetting(key as keyof typeof DEFAULT_SETTINGS, value);
  }

  return NextResponse.json({ settings: getSettings() });
}
