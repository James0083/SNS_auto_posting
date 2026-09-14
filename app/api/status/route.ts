export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { checkClaude } from "@/lib/claude";
import { checkCloudflare } from "@/lib/ai/cloudflare";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const [claude, cloudflare] = await Promise.all([checkClaude(), checkCloudflare()]);
  return NextResponse.json({
    claude,
    cloudflare,
    // 하위 호환: 키가 채워졌는지 여부만 보던 기존 소비자를 위해 유지
    cloudflareConfigured: cloudflare.configured,
    settings: getSettings(),
  });
}
