// Cloudflare Workers AI 연결 상태 점검.
// env 키가 채워졌는지(configured)뿐 아니라, 계정 ID + 토큰 + AI 접근 권한이
// 실제로 유효한지(reachable)까지 확인한다.
// models/search는 뉴런 과금이 없는 조회 엔드포인트라 상태 체크용으로 안전하다.
export type CloudflareStatus =
  | { configured: false }
  | { configured: true; reachable: boolean; error?: string };

export async function checkCloudflare(): Promise<CloudflareStatus> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return { configured: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=1`,
      { headers: { Authorization: `Bearer ${apiToken}` }, signal: controller.signal },
    );
    if (res.ok) return { configured: true, reachable: true };
    if (res.status === 401 || res.status === 403) {
      return { configured: true, reachable: false, error: "인증 실패 — 계정 ID/토큰을 확인하세요." };
    }
    return { configured: true, reachable: false, error: `Cloudflare 응답 오류 (${res.status}).` };
  } catch (e) {
    const err = e as Error;
    return {
      configured: true,
      reachable: false,
      error: err.name === "AbortError" ? "응답 시간 초과 (8초)." : `요청 실패: ${err.message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
