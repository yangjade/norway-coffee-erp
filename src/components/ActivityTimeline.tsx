"use client";

import Link from "next/link";
import {
  buildActivityFeed,
  kindLabel,
  type ActivityItem,
} from "@/lib/activity";
import { useApp } from "@/lib/app-context";

export function useRecentActivity(limit = 10): ActivityItem[] {
  const {
    orders,
    quotations,
    receivables,
    payments,
    stockMoves,
    customerName,
  } = useApp();
  return buildActivityFeed({
    orders,
    quotations,
    receivables,
    payments,
    stockMoves,
    customerName,
    limit,
  });
}

export function ActivityTimeline({
  items,
  title = "近期動態",
}: {
  items: ActivityItem[];
  title?: string;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2.5">
        <h2 className="font-display text-base tracking-wide text-[var(--brand-deep)]">
          {title}
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">尚無動態</p>
      ) : (
        <ol className="activity-feed">
          {items.map((item) => (
            <li key={item.id} className="activity-item">
              <span className={`activity-dot kind-${item.kind}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[10px] tracking-wide text-[var(--wood)]">
                    {kindLabel(item.kind)}
                  </span>
                  <time className="text-[11px] tabular-nums text-[var(--muted)]">
                    {item.at}
                  </time>
                </div>
                <Link
                  href={item.href}
                  className="mt-0.5 block truncate text-sm font-medium text-[var(--brand)] underline-offset-2 hover:underline"
                >
                  {item.title}
                </Link>
                <p className="truncate text-xs text-[var(--muted)]">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
