"use client";

import { useEffect, useState } from "react";

type CloudflareStatus =
  | { configured: false }
  | { configured: true; reachable: boolean; error?: string };

type Status = {
  claude: { installed: boolean; version?: string };
  cloudflare: CloudflareStatus;
};

function cloudflareView(cf: CloudflareStatus | undefined): { tone: string; text: string } {
  if (!cf) return { tone: "", text: "확인 중..." };
  if (!cf.configured) {
    return { tone: "warn", text: "미설정 (env.sample 참고, 없어도 나머지는 동작)" };
  }
  if (cf.reachable) return { tone: "ok", text: "연결됨" };
  return { tone: "bad", text: `연결 실패 — ${cf.error ?? "원인 불명"}` };
}

export default function StatusBar() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  const cf = cloudflareView(status?.cloudflare);

  return (
    <div className="status-bar">
      <span className={`dot ${status ? (status.claude.installed ? "ok" : "bad") : ""}`} />
      <span>
        Claude CLI{" "}
        {status
          ? status.claude.installed
            ? `연결됨 (${status.claude.version})`
            : "미설치 — claude --version으로 확인하세요"
          : "확인 중..."}
      </span>
      <span className={`dot ${cf.tone}`} />
      <span>Cloudflare AI (이미지 생성) {cf.text}</span>
    </div>
  );
}
