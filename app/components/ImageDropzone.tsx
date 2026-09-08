"use client";

import { useRef, useState } from "react";

export default function ImageDropzone({
  files,
  onChange,
  disabled,
  label,
  hint = "클릭하거나 파일을 이 영역에 끌어다 놓으세요",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    onChange([...files, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div
        className={`dropzone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) addFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <p>{label}</p>
        <p className="hint">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {files.length > 0 && (
        <div className="file-chip-list">
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="file-chip">
              {f.name}
              <button
                type="button"
                className="chip-remove"
                onClick={() => removeFile(i)}
                disabled={disabled}
                aria-label={`${f.name} 제거`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
