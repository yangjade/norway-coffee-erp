"use client";

export function PaginationBar({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination-bar no-print">
      <p className="text-xs text-[var(--muted)]">
        第 {from}–{to} 筆 · 共 {total} 筆 · 每頁 {pageSize}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="btn-ghost px-2.5 py-1 text-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一頁
        </button>
        <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-[var(--brand-deep)]">
          {page} / {pageCount}
        </span>
        <button
          type="button"
          className="btn-ghost px-2.5 py-1 text-xs"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
