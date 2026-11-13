"use client";

import type { ReactNode } from "react";

/** A4 文件表頭：列印時顯示公司名 */
export function PrintSheet({
  docTitle,
  docId,
  children,
  meta,
}: {
  docTitle: string;
  docId: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="print-sheet">
      <div className="print-only print-brand">
        <p className="brand-wordmark text-2xl">挪威的咖啡</p>
        <p className="mt-1 text-sm">
          {docTitle} · {docId}
        </p>
        {meta && <div className="mt-2 text-xs text-[var(--muted)]">{meta}</div>}
      </div>
      {children}
    </div>
  );
}

export function PrintActions({
  onPrint,
  extra,
}: {
  onPrint?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        type="button"
        className="btn-ghost"
        onClick={() => {
          if (onPrint) onPrint();
          else window.print();
        }}
      >
        列印／預覽 A4
      </button>
      {extra}
    </div>
  );
}
