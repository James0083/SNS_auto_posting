"use client";

import { useCallback, useEffect, useState } from "react";
import Lightbox from "@/app/components/Lightbox";

export type ReelsJob = {
  id: number;
  status: "pending" | "generating" | "done" | "failed";
  error: string | null;
};

type ReelsTitle = { candidate_index: number; text: string; chosen: number };
type ReelsDraft = { body_text: string; cta_included_json: string; qc_json: string };
type ReelsImage = { local_path: string | null; verdict_ok: number; verdict_reason: string | null };

type JobDetail = {
  job: ReelsJob & { input_type?: string };
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

const STATUS_LABEL: Record<ReelsJob["status"], string> = {
  pending: "대기 중",
  generating: "생성 중",
  done: "완료",
  failed: "실패",
};

export default function ReelsJobCard({
  job,
  defaultOpen = false,
}: {
  job: ReelsJob;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/reels/jobs/${job.id}`);
    if (res.ok) setDetail(await res.json());
  }, [job.id]);

  useEffect(() => {
    if (!open) return;
    void loadDetail();
  }, [open, loadDetail, job.status]);

  async function chooseTitle(candidateIndex: number) {
    await fetch(`/api/reels/jobs/${job.id}/title`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateIndex }),
    });
    await loadDetail();
  }

  async function regenerate(part: "titles" | "body" | "image") {
    setRegenerating(part);
    try {
      await fetch(`/api/reels/jobs/${job.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part }),
      });
      await loadDetail();
    } finally {
      setRegenerating(null);
    }
  }

  const qc = detail?.draft?.qc_json ? JSON.parse(detail.draft.qc_json) : null;
  const cta = detail?.draft?.cta_included_json ? JSON.parse(detail.draft.cta_included_json) : null;
  const chosenTitle = detail?.titles.find((t) => t.chosen)?.text;

  return (
    <div className="card job-card">
      <button
        type="button"
        className="job-card-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`badge badge-${job.status}`}>{STATUS_LABEL[job.status]}</span>
        <span className="job-card-title">{chosenTitle ?? `릴스 각색 #${job.id}`}</span>
        <span className="hint">{open ? "▲" : "▼"}</span>
      </button>

      {job.error && (
        <p className="hint" style={{ color: "var(--bad)" }}>
          {job.error}
        </p>
      )}

      {open && detail && (
        <div style={{ marginTop: 12 }}>
          <div className="field-row">
            <label>후킹 제목 후보</label>
            <button
              className="secondary"
              onClick={() => regenerate("titles")}
              disabled={regenerating === "titles"}
            >
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

          <div className="field-row">
            <label>본문</label>
            <button
              className="secondary"
              onClick={() => regenerate("body")}
              disabled={regenerating === "body"}
            >
              {regenerating === "body" ? "재생성 중..." : "본문만 재생성"}
            </button>
          </div>
          {detail.draft ? (
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
          ) : (
            <p className="hint">본문 생성 대기 중…</p>
          )}

          {qc && (
            <ul className="qc-list">
              <li>{qc.noHashtags ? "✅" : "❌"} 해시태그 없음 (자동 확인)</li>
              <li>{qc.hasBoldMarker ? "✅" : "⚠️"} 굵게 강조 존재 (자동 확인)</li>
              {cta && (
                <li>
                  CTA 포함:{" "}
                  {Object.entries(cta)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(", ") || "없음"}{" "}
                  (자동 확인)
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

          <div className="field-row">
            <label>재생성 이미지</label>
            <button
              className="secondary"
              onClick={() => regenerate("image")}
              disabled={regenerating === "image"}
            >
              {regenerating === "image" ? "재생성 중..." : "이미지만 재생성"}
            </button>
          </div>
          {detail.image?.local_path ? (
            <div className="image-grid">
              <img
                src={`/api/file?path=${encodeURIComponent(detail.image.local_path)}`}
                alt="reels"
                onClick={() =>
                  setLightbox(`/api/file?path=${encodeURIComponent(detail.image!.local_path!)}`)
                }
              />
            </div>
          ) : (
            detail.image && <p className="hint">실패: {detail.image.verdict_reason}</p>
          )}

          {detail.job.status === "done" && (
            <a href={`/api/reels/jobs/${job.id}/download`}>
              <button>이 릴스 zip 다운로드</button>
            </a>
          )}

          <div className="log-list">
            {detail.logs.map((log, i) => (
              <div key={i}>{log.message}</div>
            ))}
          </div>
        </div>
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
