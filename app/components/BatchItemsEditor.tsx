"use client";

import type { ReactNode } from "react";

// 배치 입력용 반복 항목 편집기. 항목 번호 / 삭제 버튼 / "+ 항목 추가" 외형만 담당하고,
// 각 항목의 실제 입력 UI는 renderItem으로 주입한다.
export default function BatchItemsEditor<T>({
  items,
  onChange,
  makeEmpty,
  renderItem,
  max,
  disabled,
  addLabel = "+ 항목 추가",
  itemNoun = "항목",
}: {
  items: T[];
  onChange: (items: T[]) => void;
  makeEmpty: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  max: number;
  disabled?: boolean;
  addLabel?: string;
  itemNoun?: string;
}) {
  function update(index: number, patch: Partial<T>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function add() {
    if (items.length >= max) return;
    onChange([...items, makeEmpty()]);
  }

  return (
    <div className="batch-items">
      {items.map((item, i) => (
        <div className="batch-item" key={i}>
          <div className="batch-item-head">
            <span className="batch-item-no">
              {itemNoun} {i + 1}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                className="chip-remove"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label={`${itemNoun} ${i + 1} 삭제`}
              >
                삭제
              </button>
            )}
          </div>
          {renderItem(item, (patch) => update(i, patch), i)}
        </div>
      ))}

      <button
        type="button"
        className="secondary"
        onClick={add}
        disabled={disabled || items.length >= max}
      >
        {addLabel}
        {items.length >= max ? ` (최대 ${max})` : ""}
      </button>
    </div>
  );
}
