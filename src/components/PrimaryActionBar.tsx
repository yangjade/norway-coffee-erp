"use client";

import type { ReactNode } from "react";

/** 詳情頁常駐主操作列 */
export function PrimaryActionBar({
  status,
  children,
}: {
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="primary-action-bar no-print"
      data-prod-feel="primary-actions"
    >
      {status && (
        <div className="min-w-0 flex-1 text-sm text-[var(--muted)]">
          {status}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
