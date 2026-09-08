"use client";

import { useEffect, useState } from "react";

type Status = {
  claude: { installed: boolean; version?: string };
  cloudflareConfigured: boolean;
};

export default function StatusBar() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  return (
    <div className="status-bar">
      <span className={`dot ${status?.claude.installed ? "ok" : "bad"}`} />
      <span>
        Claude CLI{" "}
        {status?.claude.installed ? `연결됨 (${status.claude.version})` : "미설치 — claude --version으로 확인하세요"}
      </span>
      <span className={`dot ${status?.cloudflareConfigured ? "ok" : "warn"}`} />
      <span>
        AI 이미지 생성{" "}
        {status?.cloudflareConfigured ? "설정됨" : "미설정 (env.sample 참고, 없어도 나머지는 동작)"}
      </span>
    </div>
  );
}
