import Link from "next/link";
import type { ReactNode } from "react";

type NoticeKind = "empty" | "denied" | "reserved" | "info" | "error";

const STYLES: Record<
  NoticeKind,
  { label: string; box: string; tag: string }
> = {
  empty: {
    label: "無資料",
    box: "border-[var(--border)] bg-[var(--surface)]",
    tag: "text-[var(--muted)] border-[var(--border)] bg-[var(--linen)]",
  },
  denied: {
    label: "無權限",
    box: "border-[var(--danger-border)] bg-[var(--danger-bg)]",
    tag: "text-[var(--danger)] border-[var(--danger-border)] bg-[var(--surface)]",
  },
  reserved: {
    label: "未建置",
    box: "border-dashed border-[var(--border)] bg-[var(--surface)]",
    tag: "text-[var(--brand)] border-[var(--border)] bg-[var(--brand-soft)]",
  },
  info: {
    label: "說明",
    box: "border-[var(--border)] bg-[var(--mist-blue)]/35",
    tag: "text-[var(--brand-deep)] border-[var(--border)] bg-[var(--surface)]",
  },
  error: {
    label: "載入失敗",
    box: "border-[var(--danger-border)] bg-[var(--danger-bg)]",
    tag: "text-[var(--danger)] border-[var(--danger-border)] bg-[var(--surface)]",
  },
};

export function Notice({
  kind,
  title,
  children,
  showHomeLink = false,
  footnote,
}: {
  kind: NoticeKind;
  title?: string;
  children: ReactNode;
  showHomeLink?: boolean;
  footnote?: string;
}) {
  const s = STYLES[kind];
  return (
    <div
      className={`rounded-[var(--radius)] border px-5 py-5 ${s.box}`}
      role={kind === "error" || kind === "denied" ? "alert" : undefined}
    >
      <p
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-[0.05em] ${s.tag}`}
      >
        {s.label}
      </p>
      {title && (
        <p className="mt-3.5 text-sm font-medium leading-relaxed text-[var(--brand-deep)]">
          {title}
        </p>
      )}
      <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {children}
      </div>
      {footnote && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted)] opacity-80">
          {footnote}
        </p>
      )}
      {showHomeLink && (
        <Link href="/" className="btn-primary mt-5">
          返回首頁
        </Link>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="brand-rule mb-3.5" />
        <p className="eyebrow mb-2.5">挪威的咖啡</p>
        <h1 className="font-display text-[1.8rem] tracking-[0.04em] text-[var(--brand-deep)] sm:text-[2.15rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 text-sm">{actions}</div>
      )}
    </div>
  );
}

/** 統一載入骨架：柔和過渡，避免空白閃爍 */
export function LoadingState({
  title,
  rows = 4,
}: {
  title: string;
  rows?: number;
}) {
  return (
    <div className="space-y-6 animate-rise" aria-busy="true" aria-live="polite">
      <PageHeader title={title} description="正在讀取本機資料…" />
      <div className="filter-bar gap-3">
        <div className="skeleton-bar h-10 flex-1 min-w-[8rem]" />
        <div className="skeleton-bar h-10 w-28" />
        <div className="skeleton-bar h-10 w-24" />
      </div>
      <div className="table-shell space-y-3 p-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-bar h-11 w-full"
            style={{ opacity: 1 - i * 0.1 }}
          />
        ))}
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        資料同步中，請稍候。
      </p>
    </div>
  );
}
