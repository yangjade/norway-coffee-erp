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
    box: "border-[var(--warn-border)] bg-[var(--warn-bg)]",
    tag: "text-[var(--brand-deep)] border-[var(--warn-border)] bg-[var(--surface)]",
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
    <div className={`border px-5 py-5 ${s.box}`}>
      <p
        className={`inline-block border px-2 py-0.5 text-[11px] font-medium tracking-[0.08em] ${s.tag}`}
      >
        {s.label}
      </p>
      {title && (
        <p className="mt-3 text-sm font-medium text-[var(--brand-deep)]">
          {title}
        </p>
      )}
      <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {children}
      </div>
      {footnote && (
        <p className="mt-2 text-xs text-[var(--muted)] opacity-80">{footnote}</p>
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="brand-rule mb-3" />
        <h1 className="font-display text-2xl font-semibold tracking-[0.04em] text-[var(--brand)] sm:text-[1.85rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-[var(--muted)]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 text-sm">{actions}</div>
      )}
    </div>
  );
}
