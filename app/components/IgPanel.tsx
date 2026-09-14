"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ImageDropzone from "@/app/components/ImageDropzone";
import BatchItemsEditor from "@/app/components/BatchItemsEditor";
import Lightbox from "@/app/components/Lightbox";
import ImageEditor from "@/app/components/ImageEditor";

type IgImage = {
  slide_index: number;
  role: string;
  local_path: string | null;
  composited_path: string | null;
  verdict_ok: number;
  verdict_reason: string | null;
};

type IgTitle = { candidate_index: number; text: string; chosen: number };

type IgJob = {
  id: number;
  keyword: string;
  status: "pending" | "generating" | "done" | "failed";
  content_source: "keyword" | "adapt";
  caption: string | null;
  error: string | null;
};

type JobDetail = { job: IgJob; images: IgImage[]; titles: IgTitle[]; logs: { message: string }[] };

type TrendKeyword = { keyword: string; reason: string };

type InputMode = "keyword" | "adapt";
type Mode = "auto" | "experience" | "branding";
type PhotoSource = "ai" | "upload";
type KeywordItem = { keyword: string; files: File[] };
type AdaptItem = { text: string; files: File[] };

const MAX_ITEMS = 20;
const STATUS_LABEL: Record<IgJob["status"], string> = {
  pending: "대기 중",
  generating: "생성 중",
  done: "완료",
  failed: "실패",
};

export default function IgPanel() {
  const [inputMode, setInputMode] = useState<InputMode>("keyword");

  const [keywordItems, setKeywordItems] = useState<KeywordItem[]>([{ keyword: "", files: [] }]);
  const [adaptItems, setAdaptItems] = useState<AdaptItem[]>([{ text: "", files: [] }]);

  const [mode, setMode] = useState<Mode>("auto");
  const [photoSource, setPhotoSource] = useState<PhotoSource>("ai");
  const [imageStyle, setImageStyle] = useState<"photo" | "illust">("photo");
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [carouselCount, setCarouselCount] = useState(4);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobIds, setJobIds] = useState<number[]>([]);
  const [jobs, setJobs] = useState<IgJob[]>([]);

  const [trendCandidates, setTrendCandidates] = useState<TrendKeyword[] | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshJobs = useCallback(async () => {
    if (jobIds.length === 0) return;
    const url = batchId ? `/api/ig/jobs?batch=${batchId}` : "/api/ig/jobs";
    const res = await fetch(url);
    if (!res.ok) return;
    const data: { jobs: IgJob[] } = await res.json();
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

  async function fetchTrends() {
    setTrendLoading(true);
    setTrendError(null);
    try {
      const res = await fetch("/api/ig/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrendError(data.error ?? "트렌드 발굴에 실패했습니다.");
        setTrendCandidates(null);
        return;
      }
      setTrendCandidates(data.keywords);
    } catch {
      setTrendError("트렌드 발굴 요청에 실패했습니다.");
      setTrendCandidates(null);
    } finally {
      setTrendLoading(false);
    }
  }

  function addTrendKeyword(kw: string) {
    setKeywordItems((prev) => {
      const firstEmpty = prev.findIndex((it) => !it.keyword.trim());
      if (firstEmpty >= 0)
        return prev.map((it, i) => (i === firstEmpty ? { ...it, keyword: kw } : it));
      if (prev.length >= MAX_ITEMS) return prev;
      return [...prev, { keyword: kw, files: [] }];
    });
  }

  async function submit() {
    const form = new FormData();
    form.set("contentSource", inputMode);
    form.set("mode", mode);
    form.set("imageStyle", imageStyle);
    form.set("carouselEnabled", String(carouselEnabled));
    form.set("carouselCount", String(carouselCount));

    let count = 0;
    if (inputMode === "keyword") {
      const items = keywordItems.filter((it) => it.keyword.trim());
      if (items.length === 0) {
        setError("주제/키워드를 최소 1개 입력해주세요.");
        return;
      }
      if (photoSource === "upload" && items.some((it) => it.files.length === 0)) {
        setError("직접 촬영한 사진 변환은 항목마다 사진을 최소 1장 올려야 합니다.");
        return;
      }
      form.set("photoSource", photoSource);
      items.forEach((it, i) => {
        form.set(`keyword_${i}`, it.keyword.trim());
        if (photoSource === "upload") it.files.forEach((f) => form.append(`images_${i}`, f));
      });
      count = items.length;
    } else {
      const items = adaptItems.filter((it) => it.text.trim() || it.files.length > 0);
      if (items.length === 0) {
        setError("원문 텍스트나 이미지를 최소 1개 항목에 넣어주세요.");
        return;
      }
      form.set("photoSource", "ai");
      items.forEach((it, i) => {
        if (it.text.trim()) form.set(`sourceText_${i}`, it.text.trim());
        it.files.forEach((f) => form.append(`images_${i}`, f));
      });
      count = items.length;
    }
    form.set("count", String(count));

    setSubmitting(true);
    setError(null);
    setJobs([]);
    try {
      const res = await fetch("/api/ig/jobs", { method: "POST", body: form });
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
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button
            className={`tab ${inputMode === "keyword" ? "active" : ""}`}
            onClick={() => setInputMode("keyword")}
          >
            주제/키워드로 생성
          </button>
          <button
            className={`tab ${inputMode === "adapt" ? "active" : ""}`}
            onClick={() => setInputMode("adapt")}
          >
            해외 콘텐츠 각색
          </button>
        </div>

        {inputMode === "keyword" ? (
          <>
            <div className="field-row">
              <label>주제/키워드 (여러 개 가능)</label>
              <button
                type="button"
                className="secondary"
                onClick={fetchTrends}
                disabled={trendLoading}
              >
                {trendLoading ? "웹에서 트렌드 찾는 중..." : "트렌드 발굴하기"}
              </button>
            </div>
            <BatchItemsEditor<KeywordItem>
              items={keywordItems}
              onChange={setKeywordItems}
              makeEmpty={() => ({ keyword: "", files: [] })}
              max={MAX_ITEMS}
              disabled={submitting}
              addLabel="+ 키워드 추가"
              itemNoun="키워드"
              renderItem={(item, update) => (
                <>
                  <input
                    type="text"
                    value={item.keyword}
                    onChange={(e) => update({ keyword: e.target.value })}
                    placeholder="예: 제주도 여행, 홈카페"
                    disabled={submitting}
                  />
                  {photoSource === "upload" && (
                    <div style={{ marginTop: 8 }}>
                      <ImageDropzone
                        files={item.files}
                        onChange={(files) => update({ files })}
                        disabled={submitting}
                        label="직접 촬영한 사진 업로드"
                        hint="이 항목에 쓸 사진을 올리세요 (컨셉만 참고해 새 이미지로 재생성)"
                      />
                    </div>
                  )}
                </>
              )}
            />

            {trendError && (
              <p className="hint" style={{ color: "var(--bad)" }}>
                {trendError}
              </p>
            )}
            {trendCandidates && trendCandidates.length > 0 && (
              <div className="trend-candidate-list">
                {trendCandidates.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    className="trend-candidate"
                    onClick={() => addTrendKeyword(c.keyword)}
                    disabled={submitting}
                  >
                    <strong>{c.keyword}</strong>
                    <span className="hint">{c.reason}</span>
                  </button>
                ))}
              </div>
            )}

            <label>작성 유형</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              disabled={submitting}
            >
              <option value="auto">자동발굴</option>
              <option value="experience">체험단</option>
              <option value="branding">브랜딩</option>
            </select>

            <label>이미지 소스</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="photoSource"
                  checked={photoSource === "ai"}
                  onChange={() => setPhotoSource("ai")}
                  disabled={submitting}
                />
                AI 자동 생성
              </label>
              <label>
                <input
                  type="radio"
                  name="photoSource"
                  checked={photoSource === "upload"}
                  onChange={() => setPhotoSource("upload")}
                  disabled={submitting}
                />
                직접 촬영한 사진 변환
              </label>
            </div>
          </>
        ) : (
          <>
            <label>해외 원문 (항목마다 텍스트 · 이미지 · 둘 다 가능)</label>
            <BatchItemsEditor<AdaptItem>
              items={adaptItems}
              onChange={setAdaptItems}
              makeEmpty={() => ({ text: "", files: [] })}
              max={MAX_ITEMS}
              disabled={submitting}
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
            <p className="hint">
              업로드한 이미지는 그대로 게시되지 않고, 컨셉만 참고해 저작권·초상권에 안전한 새
              이미지로 재생성됩니다. 원문의 수치·고유명사·안전 경고는 유지하고, 광고·종교·이념
              프레이밍은 제거합니다.
            </p>
          </>
        )}

        <label className="row" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={carouselEnabled}
            onChange={(e) => setCarouselEnabled(e.target.checked)}
            disabled={submitting}
            style={{ width: "auto" }}
          />
          <span>캐러셀(여러 장) 사용</span>
        </label>
        {carouselEnabled && (
          <>
            <label>장수 ({carouselCount}장)</label>
            <input
              type="range"
              min={2}
              max={10}
              value={carouselCount}
              onChange={(e) => setCarouselCount(Number(e.target.value))}
              disabled={submitting}
            />
          </>
        )}

        <label>이미지 스타일</label>
        <select
          value={imageStyle}
          onChange={(e) => setImageStyle(e.target.value as typeof imageStyle)}
          disabled={submitting}
        >
          <option value="photo">사진풍</option>
          <option value="illust">일러스트풍</option>
        </select>

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
              <a href={`/api/ig/jobs/batch/${batchId}/download`}>
                <button className="secondary" disabled={anyRunning}>
                  배치 전체 zip
                </button>
              </a>
            </div>
          )}
          {jobs.map((job) => (
            <IgJobCard key={job.id} job={job} />
          ))}
        </>
      )}
    </div>
  );
}

function IgJobCard({ job }: { job: IgJob }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<"image" | "titles" | null>(null);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/ig/jobs/${job.id}`);
    if (res.ok) setDetail(await res.json());
  }, [job.id]);

  useEffect(() => {
    if (!open) return;
    void loadDetail();
  }, [open, loadDetail, job.status]);

  async function regenerate(part: "image" | "titles") {
    setRegenerating(part);
    try {
      await fetch(`/api/ig/jobs/${job.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part }),
      });
      await loadDetail();
    } finally {
      setRegenerating(null);
    }
  }

  async function chooseTitle(candidateIndex: number) {
    await fetch(`/api/ig/jobs/${job.id}/title`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateIndex }),
    });
    await loadDetail();
  }

  const isBusy = job.status === "pending" || job.status === "generating";
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
        <span className="job-card-title">{job.keyword}</span>
        <span className="hint">{open ? "▲" : "▼"}</span>
      </button>

      {job.error && (
        <p className="hint" style={{ color: "var(--bad)" }}>
          {job.error}
        </p>
      )}

      {open && detail && (
        <div style={{ marginTop: 12 }}>
          {detail.job.caption && (
            <>
              <div className="field-row">
                <label>후킹 제목 후보</label>
                <button
                  className="secondary"
                  onClick={() => regenerate("titles")}
                  disabled={isBusy || regenerating === "titles"}
                >
                  {regenerating === "titles" ? "재생성 중..." : "제목만 재생성"}
                </button>
              </div>
              {detail.titles.length > 0 ? (
                detail.titles.map((t) => (
                  <button
                    key={t.candidate_index}
                    className={`title-candidate ${t.chosen ? "chosen" : ""}`}
                    onClick={() => chooseTitle(t.candidate_index)}
                  >
                    {t.text}
                  </button>
                ))
              ) : (
                <p className="hint">후킹 제목 생성 대기 중…</p>
              )}
            </>
          )}

          {detail.job.caption ? (
            <>
              <label>캡션</label>
              <pre className="script">{detail.job.caption}</pre>
              <button
                className="secondary"
                onClick={() =>
                  navigator.clipboard.writeText(
                    chosenTitle ? `${chosenTitle}\n\n${detail.job.caption}` : (detail.job.caption ?? ""),
                  )
                }
              >
                {chosenTitle ? "제목+캡션 복사" : "캡션 복사"}
              </button>
            </>
          ) : (
            <p className="hint">캡션 생성 대기 중…</p>
          )}

          {detail.images.length > 0 && (
            <>
              <div className="field-row">
                <label>이미지</label>
                <button
                  className="secondary"
                  onClick={() => regenerate("image")}
                  disabled={isBusy || regenerating === "image"}
                >
                  {regenerating === "image" ? "재생성 중..." : "이미지만 재생성"}
                </button>
              </div>
              <div className="image-grid">
                {detail.images.map((img) => {
                  const originalSrc = img.local_path
                    ? `/api/file?path=${encodeURIComponent(img.local_path)}`
                    : null;
                  const compositedSrc = img.composited_path
                    ? `/api/file?path=${encodeURIComponent(img.composited_path)}`
                    : null;
                  const displaySrc = compositedSrc ?? originalSrc;
                  return (
                    <div key={img.slide_index} className="image-grid-item">
                      {displaySrc ? (
                        <img
                          src={displaySrc}
                          alt={img.role}
                          onClick={() => setLightbox(displaySrc)}
                        />
                      ) : (
                        <div className="hint">실패: {img.verdict_reason}</div>
                      )}
                      {compositedSrc && <p className="hint">합성됨</p>}
                      {originalSrc && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setEditingSlide(img.slide_index)}
                        >
                          편집
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {detail.job.status === "done" && (
            <a href={`/api/ig/jobs/${job.id}/download`}>
              <button>이 게시물 zip 다운로드</button>
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

      {editingSlide !== null &&
        (() => {
          const img = detail?.images.find((i) => i.slide_index === editingSlide);
          if (!img?.local_path) return null;
          return (
            <ImageEditor
              imageSrc={`/api/file?path=${encodeURIComponent(img.local_path)}`}
              initialTitle={chosenTitle ?? ""}
              jobId={job.id}
              slideIndex={editingSlide}
              onClose={() => setEditingSlide(null)}
              onSaved={loadDetail}
            />
          );
        })()}
    </div>
  );
}
