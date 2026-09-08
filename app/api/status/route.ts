export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { checkClaude } from "@/lib/claude";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const claude = await checkClaude();
  const cloudflareConfigured = Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN,
  );
  return NextResponse.json({ claude, cloudflareConfigured, settings: getSettings() });
}
