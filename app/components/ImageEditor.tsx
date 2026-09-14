"use client";

import { useEffect, useRef, useState } from "react";

type Weight = "bold" | "extrabold" | "black";
type Align = "left" | "center" | "right";
const WEIGHT_NUM: Record<Weight, number> = { bold: 700, extrabold: 800, black: 900 };
const ALIGN_LABEL: Record<Align, string> = { left: "왼쪽", center: "가운데", right: "오른쪽" };
const LOGO_STORAGE_KEY = "igEditor.logoDataUrl";
const NUDGE_STEP = 3; // % of canvas dimension per arrow click
const NUDGE_LIMIT = 45;

// 원본 이미지 위에 제목 텍스트·그라데이션·로고를 합성하는 편집기.
// AI 이미지 생성 단계는 여전히 "텍스트 없음" 규칙을 따른다 — 이건 생성 이후
// 브라우저 Canvas에서 얹는 별도 후처리 단계라 그 규칙과 충돌하지 않는다.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function ImageEditor({
  imageSrc,
  initialTitle,
  jobId,
  slideIndex,
  onClose,
  onSaved,
}: {
  imageSrc: string;
  initialTitle: string;
  jobId: number;
  slideIndex: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  const [imageReady, setImageReady] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [offsetXPct, setOffsetXPct] = useState(0);
  const [offsetYPct, setOffsetYPct] = useState(0);
  const [fontSizePct, setFontSizePct] = useState(8);
  const [weight, setWeight] = useState<Weight>("extrabold");
  const [align, setAlign] = useState<Align>("center");
  const [gradientDarkness, setGradientDarkness] = useState(70);
  const [gradientRangePct, setGradientRangePct] = useState(45);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 원본 이미지 로드
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImageReady(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // 로고: 이전에 올린 걸 브라우저에 기억해두고 다음에도 자동 적용(서버 저장 아님, 개인 편의용)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOGO_STORAGE_KEY);
      if (saved) setLogoDataUrl(saved);
    } catch {
      // 프라이빗 모드 등에서 접근 실패해도 무시
    }
  }, []);

  useEffect(() => {
    if (!logoDataUrl) {
      logoImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      logoImgRef.current = img;
      draw();
    };
    img.src = logoDataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logoDataUrl]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = img.naturalWidth;
    const h = img.naturalHeight;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // 그라데이션 (하단 → 위, 어둡게)
    const rangeH = h * (gradientRangePct / 100);
    const grad = ctx.createLinearGradient(0, h - rangeH, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${gradientDarkness / 100})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - rangeH, w, rangeH);

    // 로고 (우하단)
    const logoImg = logoImgRef.current;
    if (logoImg) {
      const logoW = w * 0.18;
      const logoH = logoW * (logoImg.naturalHeight / logoImg.naturalWidth);
      const pad = w * 0.04;
      ctx.drawImage(logoImg, w - logoW - pad, h - logoH - pad, logoW, logoH);
    }

    // 제목 텍스트
    const trimmed = title.trim();
    if (trimmed) {
      const fontPx = Math.round(h * (fontSizePct / 100));
      ctx.font = `${WEIGHT_NUM[weight]} ${fontPx}px -apple-system, "Apple SD Gothic Neo", sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textAlign = align;
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = fontPx * 0.18;
      ctx.shadowOffsetY = fontPx * 0.05;

      const maxTextWidth = w * 0.86;
      const lines = title
        .split("\n")
        .flatMap((p) => (p.trim() ? wrapText(ctx, p, maxTextWidth) : [""]));

      const lineHeight = fontPx * 1.28;
      const totalHeight = lines.length * lineHeight;
      const sideMargin = w * 0.07;
      const baseX = align === "left" ? sideMargin : align === "right" ? w - sideMargin : w / 2;
      const anchorX = baseX + w * (offsetXPct / 100);
      const baseY = h - h * 0.08 - totalHeight + lineHeight;
      const anchorY = baseY + h * (offsetYPct / 100);

      lines.forEach((line, i) => {
        ctx.fillText(line, anchorX, anchorY + i * lineHeight);
      });
      ctx.shadowBlur = 0;
    }
  }

  useEffect(() => {
    if (!imageReady) return;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imageReady,
    title,
    offsetXPct,
    offsetYPct,
    fontSizePct,
    weight,
    align,
    gradientDarkness,
    gradientRangePct,
  ]);

  function nudge(dx: number, dy: number) {
    setOffsetXPct((v) => Math.max(-NUDGE_LIMIT, Math.min(NUDGE_LIMIT, v + dx)));
    setOffsetYPct((v) => Math.max(-NUDGE_LIMIT, Math.min(NUDGE_LIMIT, v + dy)));
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoDataUrl(dataUrl);
      try {
        localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
      } catch {
        // 저장 실패해도 이번 세션 미리보기는 정상 동작
      }
    };
    reader.readAsDataURL(file);
  }

  function removeLogo() {
    setLogoDataUrl(null);
    logoImgRef.current = null;
    try {
      localStorage.removeItem(LOGO_STORAGE_KEY);
    } catch {
      // 무시
    }
    draw();
  }

  async function handleComposite() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    setError(null);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setSaving(false);
          setError("이미지를 만들지 못했습니다.");
          return;
        }

        // 1) 기기로 다운로드
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `slide_${slideIndex + 1}_composited.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        // 2) 서버에도 저장 (원본은 그대로 두고 합성본만 추가 — 다운로드 zip에 둘 다 포함됨)
        try {
          const form = new FormData();
          form.append("image", blob, "composited.jpg");
          form.append("slideIndex", String(slideIndex));
          const res = await fetch(`/api/ig/jobs/${jobId}/composite`, {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            setError(data?.error ?? "서버 저장에 실패했습니다 (기기 다운로드는 완료됨).");
            return;
          }
          onSaved();
          onClose();
        } catch {
          setError("서버 저장 요청에 실패했습니다 (기기 다운로드는 완료됨).");
        } finally {
          setSaving(false);
        }
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="editor-overlay" onClick={onClose}>
      <div className="editor-panel" onClick={(e) => e.stopPropagation()}>
        <div className="editor-preview">
          {imageReady ? (
            <canvas ref={canvasRef} />
          ) : (
            <p className="hint">이미지 불러오는 중...</p>
          )}
        </div>

        <div className="editor-controls">
          <label>썸네일 제목</label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="후킹 제목을 입력하세요"
            style={{ minHeight: 70 }}
          />

          <label>텍스트 위치 조정</label>
          <div className="editor-nudge-grid">
            <button type="button" className="secondary editor-nudge-up" onClick={() => nudge(0, -NUDGE_STEP)}>
              ↑
            </button>
            <button type="button" className="secondary editor-nudge-left" onClick={() => nudge(-NUDGE_STEP, 0)}>
              ←
            </button>
            <button type="button" className="secondary editor-nudge-right" onClick={() => nudge(NUDGE_STEP, 0)}>
              →
            </button>
            <button type="button" className="secondary editor-nudge-down" onClick={() => nudge(0, NUDGE_STEP)}>
              ↓
            </button>
          </div>

          <div className="field-row">
            <label>글자 크기 ({fontSizePct}%)</label>
          </div>
          <input
            type="range"
            min={3}
            max={16}
            value={fontSizePct}
            onChange={(e) => setFontSizePct(Number(e.target.value))}
          />

          <label>굵기</label>
          <div className="tabs">
            {(["bold", "extrabold", "black"] as Weight[]).map((w) => (
              <button
                key={w}
                type="button"
                className={`tab ${weight === w ? "active" : ""}`}
                onClick={() => setWeight(w)}
              >
                {w === "bold" ? "Bold" : w === "extrabold" ? "ExBold" : "Black"}
              </button>
            ))}
          </div>

          <label>정렬</label>
          <div className="tabs">
            {(["left", "center", "right"] as Align[]).map((a) => (
              <button
                key={a}
                type="button"
                className={`tab ${align === a ? "active" : ""}`}
                onClick={() => setAlign(a)}
              >
                {ALIGN_LABEL[a]}
              </button>
            ))}
          </div>

          <div className="field-row">
            <label>그라데이션 농도 (어둡게) {gradientDarkness}%</label>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={gradientDarkness}
            onChange={(e) => setGradientDarkness(Number(e.target.value))}
          />

          <div className="field-row">
            <label>그라데이션 범위 (높이) {gradientRangePct}%</label>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={gradientRangePct}
            onChange={(e) => setGradientRangePct(Number(e.target.value))}
          />

          <label>로고 (선택)</label>
          {logoDataUrl ? (
            <div className="row">
              <img src={logoDataUrl} alt="로고" className="editor-logo-preview" />
              <button type="button" className="secondary" onClick={removeLogo}>
                로고 제거
              </button>
            </div>
          ) : (
            <input type="file" accept="image/*" onChange={onLogoChange} />
          )}

          {error && (
            <p className="hint" style={{ color: "var(--bad)" }}>
              {error}
            </p>
          )}

          <div className="row" style={{ marginTop: 16 }}>
            <button onClick={handleComposite} disabled={saving || !imageReady}>
              {saving ? "저장 중..." : "이미지에 합성"}
            </button>
            <button type="button" className="secondary" onClick={onClose} disabled={saving}>
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
