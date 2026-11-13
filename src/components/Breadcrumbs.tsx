"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildBreadcrumbs } from "@/lib/nav";

export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <nav className="breadcrumbs no-print" aria-label="麵包屑">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.href}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <span className="text-[var(--border)]" aria-hidden>
                  /
                </span>
              )}
              {last ? (
                <span className="font-medium text-[var(--brand-deep)]">
                  {c.label}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="transition hover:text-[var(--brand)]"
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
