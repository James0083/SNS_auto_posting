"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ImageDropzone from "@/app/components/ImageDropzone";
import BatchItemsEditor from "@/app/components/BatchItemsEditor";
import ReelsJobCard, { type ReelsJob } from "@/app/components/ReelsJobCard";

type Item = { text: string; files: File[] };

const MAX_ITEMS = 20;

export default function ReelsPanel() {
  const [items, setItems] = useState<Item[]>([{ text: "", files: [] }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobIds, setJobIds] = useState<number[]>([]);
  const [jobs, setJobs] = useState<ReelsJob[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshJobs = useCallback(async () => {
    if (jobIds.length === 0) return;
    const url = batchId ? `/api/reels/jobs?batch=${batchId}` : "/api/reels/jobs";
    const res = await fetch(url);
    if (!res.ok) return;
    const data: { jobs: ReelsJob[] } = await res.json();
    const idSet = new Set(jobIds);
    const mine = data.jobs.filter((j) => idSet.has(j.id)).sort((a, b) => a.id - b.id);
    setJobs(mine);
    if (mine.length > 0 && mine.every((j) => j.status === "done" || j.status === "failed")) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [batchId, jobIds]);

  useEffect(() => {
    if (jobIds.length === 0) return;
    void refreshJobs();
    pollRef.current = setInterval(refreshJobs, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobIds, refreshJobs]);

  const anyRunning = jobs.some((j) => j.status === "pending" || j.status === "generating");

  async function submit() {
    const valid = items.filter((it) => it.text.trim() || it.files.length > 0);
    if (valid.length === 0) {
      setError("원문 텍스트나 이미지를 최소 1개 항목에 넣어주세요.");
      return;
    }

    const form = new FormData();
    form.set("count", String(valid.length));
    valid.forEach((it, i) => {
      if (it.text.trim()) form.set(`sourceText_${i}`, it.text.trim());
      it.files.forEach((f) => form.append(`images_${i}`, f));
    });

    setSubmitting(true);
    setError(null);
    setJobs([]);
    try {
      const res = await fetch("/api/reels/jobs", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "요청에 실패했습니다.");
        return;
      }
      setBatchId(data.batchId ?? null);
      setJobIds(data.ids ?? []);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="card">
        <label>해외 원문 (항목마다 텍스트 · 이미지 · 둘 다 가능, 여러 건 한 번에)</label>
        <BatchItemsEditor<Item>
          items={items}
          onChange={setItems}
          makeEmpty={() => ({ text: "", files: [] })}
          max={MAX_ITEMS}
          disabled={submitting}
          addLabel="+ 원문 추가"
          itemNoun="원문"
          renderItem={(item, update) => (
            <>
              <textarea
                value={item.text}
                onChange={(e) => update({ text: e.target.value })}
                placeholder="해외 SNS 원문 텍스트를 붙여넣으세요. 없으면 이미지만으로도 진행됩니다."
                disabled={submitting}
              />
              <div style={{ marginTop: 8 }}>
                <ImageDropzone
                  files={item.files}
                  onChange={(files) => update({ files })}
                  disabled={submitting}
                  label="원본 캡처 이미지 업로드 (선택)"
                  hint="클릭하거나 여러 장을 이 영역에 끌어다 놓으세요"
                />
              </div>
            </>
          )}
        />

        <div style={{ marginTop: 16 }}>
          <button onClick={submit} disabled={submitting || anyRunning}>
            {submitting ? "제출 중..." : anyRunning ? "생성 중..." : "생성하기"}
          </button>
        </div>
        {error && (
          <p className="hint" style={{ color: "var(--bad)" }}>
            {error}
          </p>
        )}
      </div>

      {jobs.length > 0 && (
        <>
          {batchId && (
            <div className="field-row">
              <label>
                작업 {jobs.length}건 · 완료 {jobs.filter((j) => j.status === "done").length}건
              </label>
              <a href={`/api/reels/jobs/batch/${batchId}/download`}>
                <button className="secondary" disabled={anyRunning}>
                  배치 전체 zip
                </button>
              </a>
            </div>
          )}
          {jobs.map((job, i) => (
            <ReelsJobCard key={job.id} job={job} defaultOpen={jobs.length === 1 || i === 0} />
          ))}
        </>
      )}
    </div>
  );
}
