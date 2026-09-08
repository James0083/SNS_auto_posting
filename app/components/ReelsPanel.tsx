"use client";

import { useEffect, useRef, useState } from "react";
import ImageDropzone from "@/app/components/ImageDropzone";

type ReelsTitle = { candidate_index: number; text: string; chosen: number };
type ReelsDraft = { body_text: string; cta_included_json: string; qc_json: string };
type ReelsImage = { local_path: string | null; verdict_ok: number; verdict_reason: string | null };
type ReelsJob = { id: number; status: "pending" | "generating" | "done" | "failed"; error: string | null };

type JobDetail = {
  job: ReelsJob;
  titles: ReelsTitle[];
  draft: ReelsDraft | null;
  image: ReelsImage | null;
  logs: { message: string }[];
};

const MANUAL_QC_ITEMS = [
  "첫 문장이 충분히 후킹되는가",
  "평서문은 ~습니다체가 중심이고 구어체가 과하지 않은가",
  "원문의 핵심 사실·수치가 왜곡 없이 유지됐는가",
  "위험/민감 소재라면 안전 경고가 포함됐는가",
  "CTA 문구가 격식체를 유지했는가(반말 없음)",
];

export default function ReelsPanel() {
  const [sourceText, setSourceText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function fetchDetail(id: number) {
    const res = await fetch(`/api/reels/jobs/${id}`);
    if (!res.ok) return;
    const data: JobDetail = await res.json();
    setDetail(data);
    return data;
  }

  function startPolling(id: number) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const data = await fetchDetail(id);
      if (data && (data.job.status === "done" || data.job.status === "failed")) {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 2000);
  }

  async function submit() {
    if (!sourceText.trim() && files.length === 0) {
      setError("원본 텍스트 또는 이미지 중 최소 1개는 필요합니다.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setDetail(null);
    try {
      const form = new FormData();
      if (sourceText.trim()) form.set("sourceText", sourceText.trim());
      files.forEach((f) => form.append("images", f));

      const res = await fetch("/api/reels/jobs", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        return;
      }
      setJobId(data.id);
      startPolling(data.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function chooseTitle(candidateIndex: number) {
    if (!jobId) return;
    await fetch(`/api/reels/jobs/${jobId}/title`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateIndex }),
    });
    await fetchDetail(jobId);
  }

  async function regenerate(part: "titles" | "body" | "image") {
    if (!jobId) return;
    setRegenerating(part);
    try {
      await fetch(`/api/reels/jobs/${jobId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part }),
      });
      await fetchDetail(jobId);
    } finally {
      setRegenerating(null);
    }
  }

  const isBusy = detail?.job.status === "generating" || detail?.job.status === "pending";
  const qc = detail?.draft?.qc_json ? JSON.parse(detail.draft.qc_json) : null;
  const cta = detail?.draft?.cta_included_json ? JSON.parse(detail.draft.cta_included_json) : null;

  return (
    <div>
      <div className="card">
        <label>원본 캡처 이미지 (선택, 여러 장 가능)</label>
        <ImageDropzone
          files={files}
          onChange={setFiles}
          disabled={isBusy}
          label="원본 캡처 이미지 업로드"
          hint="클릭하거나 여러 장을 이 영역에 끌어다 놓으세요"
        />

        <label>원본 텍스트 (선택)</label>
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="해외 SNS 원문 텍스트를 붙여넣으세요. 없으면 이미지만으로도 진행됩니다."
          disabled={isBusy}
        />

        <div style={{ marginTop: 16 }}>
          <button onClick={submit} disabled={submitting || isBusy}>
            {isBusy ? "생성 중..." : "생성하기"}
          </button>
        </div>
        {error && <p className="hint" style={{ color: "var(--bad)" }}>{error}</p>}
      </div>

      {detail && (
        <div className="card">
          <p>
            상태: <strong>{detail.job.status}</strong>
          </p>
          {detail.job.error && <p style={{ color: "var(--bad)" }}>{detail.job.error}</p>}

          <div className="row" style={{ justifyContent: "space-between" }}>
            <label style={{ margin: 0 }}>후킹 제목 후보</label>
            <button className="secondary" onClick={() => regenerate("titles")} disabled={regenerating === "titles"}>
              {regenerating === "titles" ? "재생성 중..." : "제목만 재생성"}
            </button>
          </div>
          {detail.titles.map((t) => (
            <button
              key={t.candidate_index}
              className={`title-candidate ${t.chosen ? "chosen" : ""}`}
              onClick={() => chooseTitle(t.candidate_index)}
            >
              {t.text}
            </button>
          ))}

          <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
            <label style={{ margin: 0 }}>본문</label>
            <button className="secondary" onClick={() => regenerate("body")} disabled={regenerating === "body"}>
              {regenerating === "body" ? "재생성 중..." : "본문만 재생성"}
            </button>
          </div>
          {detail.draft && (
            <>
              <pre className="script">{detail.draft.body_text}</pre>
              <button
                className="secondary"
                onClick={() => {
                  const chosen = detail.titles.find((t) => t.chosen)?.text ?? "";
                  navigator.clipboard.writeText(`${chosen}\n\n${detail.draft?.body_text ?? ""}`);
                }}
              >
                제목+본문 복사
              </button>
            </>
          )}

          {qc && (
            <ul className="qc-list">
              <li>{qc.noHashtags ? "✅" : "❌"} 해시태그 없음 (자동 확인)</li>
              <li>{qc.hasBoldMarker ? "✅" : "⚠️"} 굵게 강조 존재 (자동 확인)</li>
              {cta && (
                <li>
                  CTA 포함: {Object.entries(cta).filter(([, v]) => v).map(([k]) => k).join(", ") || "없음"} (자동 확인)
                </li>
              )}
              {MANUAL_QC_ITEMS.map((item) => (
                <li key={item}>
                  <label className="row" style={{ margin: 0 }}>
                    <input type="checkbox" style={{ width: "auto" }} />
                    <span>{item} (사람 확인 필요)</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="row" style={{ justifyContent: "space-between", marginTop: 16 }}>
            <label style={{ margin: 0 }}>재생성 이미지</label>
            <button className="secondary" onClick={() => regenerate("image")} disabled={regenerating === "image"}>
              {regenerating === "image" ? "재생성 중..." : "이미지만 재생성"}
            </button>
          </div>
          {detail.image?.local_path ? (
            <div className="image-grid">
              <img src={`/api/file?path=${encodeURIComponent(detail.image.local_path)}`} alt="reels" />
            </div>
          ) : (
            detail.image && <p className="hint">실패: {detail.image.verdict_reason}</p>
          )}

          {detail.job.status === "done" && jobId && (
            <a href={`/api/reels/jobs/${jobId}/download`}>
              <button>전체 다운로드 (zip)</button>
            </a>
          )}

          <div className="log-list">
            {detail.logs.map((log, i) => (
              <div key={i}>{log.message}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
