"use client";

import { useEffect, useRef, useState } from "react";
import ImageDropzone from "@/app/components/ImageDropzone";

type IgImage = {
  slide_index: number;
  role: string;
  local_path: string | null;
  verdict_ok: number;
  verdict_reason: string | null;
};

type IgJob = {
  id: number;
  status: "pending" | "generating" | "done" | "failed";
  caption: string | null;
  hashtags_json: string | null;
  error: string | null;
};

type JobDetail = { job: IgJob; images: IgImage[]; logs: { message: string; level: string }[] };

type TrendKeyword = { keyword: string; reason: string };

export default function IgPanel() {
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<"auto" | "experience" | "branding">("auto");
  const [photoSource, setPhotoSource] = useState<"ai" | "upload">("ai");
  const [carouselEnabled, setCarouselEnabled] = useState(false);
  const [carouselCount, setCarouselCount] = useState(4);
  const [imageStyle, setImageStyle] = useState<"photo" | "illust">("photo");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [trendCandidates, setTrendCandidates] = useState<TrendKeyword[] | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling(id: number) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/ig/jobs/${id}`);
      if (!res.ok) return;
      const data: JobDetail = await res.json();
      setDetail(data);
      if (data.job.status === "done" || data.job.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 2000);
  }

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

  async function submit() {
    if (!keyword.trim()) {
      setError("주제/키워드를 입력해주세요.");
      return;
    }
    if (photoSource === "upload" && uploadFiles.length === 0) {
      setError("직접 촬영한 사진을 최소 1장 업로드해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setDetail(null);
    try {
      const form = new FormData();
      form.set("keyword", keyword);
      form.set("mode", mode);
      form.set("photoSource", photoSource);
      form.set("carouselEnabled", String(carouselEnabled));
      form.set("carouselCount", String(carouselCount));
      form.set("imageStyle", imageStyle);
      uploadFiles.forEach((f) => form.append("images", f));

      const res = await fetch("/api/ig/jobs", { method: "POST", body: form });
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

  const hashtags: string[] = detail?.job.hashtags_json ? JSON.parse(detail.job.hashtags_json) : [];
  const isBusy = detail?.job.status === "generating" || detail?.job.status === "pending";

  return (
    <div>
      <div className="card">
        <label>이미지 소스</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              name="photoSource"
              checked={photoSource === "ai"}
              onChange={() => setPhotoSource("ai")}
              disabled={isBusy}
            />
            AI 자동 생성
          </label>
          <label>
            <input
              type="radio"
              name="photoSource"
              checked={photoSource === "upload"}
              onChange={() => setPhotoSource("upload")}
              disabled={isBusy}
            />
            직접 촬영한 사진 변환
          </label>
        </div>
        {photoSource === "upload" && (
          <p className="hint">
            업로드한 사진은 그대로 올라가지 않고, 컨셉만 참고해 저작권·초상권에 안전한 새 이미지로
            재생성됩니다. 여러 장을 올리면 그 장수만큼 캐러셀이 만들어집니다.
          </p>
        )}

        {photoSource === "upload" && (
          <div style={{ marginTop: 12 }}>
            <ImageDropzone
              files={uploadFiles}
              onChange={setUploadFiles}
              disabled={isBusy}
              label="직접 촬영한 사진 업로드"
              hint="클릭하거나 여러 장을 이 영역에 끌어다 놓으세요"
            />
          </div>
        )}

        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <label style={{ margin: 0 }}>주제/키워드</label>
          <button
            type="button"
            className="secondary"
            onClick={fetchTrends}
            disabled={isBusy || trendLoading}
          >
            {trendLoading ? "웹에서 트렌드 찾는 중..." : "트렌드 발굴하기"}
          </button>
        </div>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예: 제주도 여행, 홈카페"
          disabled={isBusy}
        />
        <p className="hint">
          웹 검색으로 실제 화제성을 확인해 주제를 추천합니다. 마음에 드는 후보를 누르면 위 입력칸이
          채워지고, 그대로 쓰거나 수정한 뒤 생성하면 됩니다.
        </p>

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
                onClick={() => setKeyword(c.keyword)}
                disabled={isBusy}
              >
                <strong>{c.keyword}</strong>
                <span className="hint">{c.reason}</span>
              </button>
            ))}
          </div>
        )}

        <label>작성 유형</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} disabled={isBusy}>
          <option value="auto">자동발굴</option>
          <option value="experience">체험단</option>
          <option value="branding">브랜딩</option>
        </select>

        <label>이미지 스타일</label>
        <select
          value={imageStyle}
          onChange={(e) => setImageStyle(e.target.value as typeof imageStyle)}
          disabled={isBusy}
        >
          <option value="photo">사진풍</option>
          <option value="illust">일러스트풍</option>
        </select>

        {photoSource === "ai" && (
          <>
            <label className="row" style={{ marginTop: 16 }}>
              <input
                type="checkbox"
                checked={carouselEnabled}
                onChange={(e) => setCarouselEnabled(e.target.checked)}
                disabled={isBusy}
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
                  disabled={isBusy}
                />
              </>
            )}
          </>
        )}

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

          {detail.job.caption && (
            <>
              <label>캡션</label>
              <pre className="script">{detail.job.caption}</pre>
              <button className="secondary" onClick={() => navigator.clipboard.writeText(detail.job.caption ?? "")}>
                캡션 복사
              </button>
            </>
          )}

          {hashtags.length > 0 && (
            <p className="hint">해시태그 {hashtags.length}개: {hashtags.map((h) => `#${h}`).join(" ")}</p>
          )}

          {detail.images.length > 0 && (
            <div className="image-grid">
              {detail.images.map((img) => (
                <div key={img.slide_index}>
                  {img.local_path ? (
                    <img src={`/api/file?path=${encodeURIComponent(img.local_path)}`} alt={img.role} />
                  ) : (
                    <div className="hint">실패: {img.verdict_reason}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {detail.job.status === "done" && jobId && (
            <a href={`/api/ig/jobs/${jobId}/download`}>
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
