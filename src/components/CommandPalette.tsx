"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useApp } from "@/lib/app-context";
import { NAV_GROUPS } from "@/lib/nav";

type Hit = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
};

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    customers,
    products,
    quotations,
    orders,
    customerName,
    currentUser,
  } = useApp();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser.Role === "Admin";

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out: Hit[] = [];

    for (const g of NAV_GROUPS) {
      for (const item of g.items) {
        if (item.adminOnly && !isAdmin) continue;
        if (
          !needle ||
          item.label.toLowerCase().includes(needle) ||
          item.href.toLowerCase().includes(needle)
        ) {
          out.push({
            id: `nav-${item.href}`,
            group: "模組",
            label: item.label,
            hint: g.label,
            href: item.href === "/" ? "/" : `${item.href}/`,
          });
        }
      }
    }

    for (const c of customers) {
      const hay = `${c.Customer_ID} ${c.Customer_Name}`.toLowerCase();
      if (!needle || hay.includes(needle)) {
        out.push({
          id: `c-${c.Customer_ID}`,
          group: "客戶",
          label: `${c.Customer_ID} ${c.Customer_Name}`,
          hint: c.Customer_Type,
          href: `/customers/${c.Customer_ID}/`,
        });
      }
    }

    for (const p of products) {
      const hay = `${p.Product_ID} ${p.Product_Name}`.toLowerCase();
      if (!needle || hay.includes(needle)) {
        out.push({
          id: `p-${p.Product_ID}`,
          group: "商品",
          label: `${p.Product_ID} ${p.Product_Name}`,
          hint: p.Category,
          href: `/products/${p.Product_ID}/`,
        });
      }
    }

    for (const quote of quotations) {
      const hay =
        `${quote.Quote_ID} ${quote.Customer_ID} ${customerName(quote.Customer_ID)}`.toLowerCase();
      if (!needle || hay.includes(needle)) {
        out.push({
          id: `q-${quote.Quote_ID}`,
          group: "報價",
          label: quote.Quote_ID,
          hint: `${customerName(quote.Customer_ID)} · ${quote.Status}`,
          href: `/quotations/${quote.Quote_ID}/`,
        });
      }
    }

    for (const o of orders) {
      const hay =
        `${o.Order_ID} ${o.Customer_ID} ${customerName(o.Customer_ID)}`.toLowerCase();
      if (!needle || hay.includes(needle)) {
        out.push({
          id: `o-${o.Order_ID}`,
          group: "訂單",
          label: o.Order_ID,
          hint: `${customerName(o.Customer_ID)} · ${o.Order_Status}`,
          href: `/orders/${o.Order_ID}/`,
        });
      }
    }

    return out.slice(0, 40);
  }, [
    q,
    customers,
    products,
    quotations,
    orders,
    customerName,
    isAdmin,
  ]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && hits[active]) {
        e.preventDefault();
        go(hits[active].href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, active, go, onClose]);

  if (!open) return null;

  return (
    <div
      className="command-backdrop no-print"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="command-panel"
        role="dialog"
        aria-modal="true"
        aria-label="快速搜尋"
        data-prod-feel="command-palette"
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-4 py-3">
          <span className="text-xs text-[var(--muted)]">搜尋</span>
          <input
            ref={inputRef}
            className="field flex-1 border-0 bg-transparent shadow-none focus:shadow-none"
            placeholder="客戶、商品、報價、訂單編號或名稱…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="快速搜尋關鍵字"
          />
          <kbd className="kbd">Esc</kbd>
        </div>
        <ul className="max-h-[min(22rem,50vh)] overflow-y-auto py-2">
          {hits.length === 0 ? (
            <li className="px-4 py-6 text-sm text-[var(--muted)]">
              找不到符合「{q}」的項目
            </li>
          ) : (
            hits.map((h, i) => (
              <li key={h.id}>
                <button
                  type="button"
                  className={`command-row ${i === active ? "is-active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(h.href)}
                >
                  <span className="command-group">{h.group}</span>
                  <span className="min-w-0 flex-1 truncate text-left">
                    <span className="font-medium text-[var(--brand-deep)]">
                      {h.label}
                    </span>
                    {h.hint && (
                      <span className="ml-2 text-xs text-[var(--muted)]">
                        {h.hint}
                      </span>
                    )}
                  </span>
                  <Link
                    href={h.href}
                    className="sr-only"
                    tabIndex={-1}
                    onClick={(e) => e.preventDefault()}
                  >
                    {h.label}
                  </Link>
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="border-t border-[var(--border-soft)] px-4 py-2 text-[11px] text-[var(--muted)]">
          ↑↓ 選擇 · Enter 開啟 · Esc 關閉
        </p>
      </div>
    </div>
  );
}

/** 全域 Ctrl/Cmd+K 監聽（掛在 AppShell） */
export function useCommandPaletteHotkey(setOpen: (v: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
