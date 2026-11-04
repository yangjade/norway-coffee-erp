"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { outstandingOf } from "@/lib/ar-rules";
import { formatTwd } from "@/lib/format";
import { todayLocalDate } from "@/lib/quotation-rules";
import type { ReceivableStatus } from "@/lib/types";
import { Notice, PageHeader } from "@/components/Notice";

const STATUS_FILTER: Array<ReceivableStatus | "全部"> = [
  "全部",
  "未收",
  "部分收款",
  "已結清",
  "已作廢",
];

export default function ReceivablesPage() {
  const {
    receivables,
    payments,
    recordArPayment,
    customerName,
    hydrated,
  } = useApp();
  const [status, setStatus] = useState<(typeof STATUS_FILTER)[number]>("全部");
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payForms, setPayForms] = useState<
    Record<string, { amount: string; date: string; note: string }>
  >({});

  const openOnly = useMemo(
    () => receivables.filter((r) => r.Status !== "已作廢"),
    [receivables],
  );

  const totals = useMemo(() => {
    const amount = openOnly.reduce((s, r) => s + r.Amount, 0);
    const paid = openOnly.reduce((s, r) => s + r.Paid_Amount, 0);
    const due = openOnly.reduce((s, r) => s + outstandingOf(r), 0);
    return { amount, paid, due, count: openOnly.length };
  }, [openOnly]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...receivables]
      .filter((r) => (status === "全部" ? true : r.Status === status))
      .filter((r) => {
        if (!needle) return true;
        return (
          r.AR_ID.toLowerCase().includes(needle) ||
          r.Order_ID.toLowerCase().includes(needle) ||
          r.Customer_ID.toLowerCase().includes(needle) ||
          customerName(r.Customer_ID).toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.Invoice_Date.localeCompare(a.Invoice_Date));
  }, [receivables, status, q, customerName]);

  function formFor(arId: string) {
    return (
      payForms[arId] ?? {
        amount: "",
        date: todayLocalDate(),
        note: "",
      }
    );
  }

  function setForm(
    arId: string,
    patch: Partial<{ amount: string; date: string; note: string }>,
  ) {
    setPayForms((prev) => ({
      ...prev,
      [arId]: { ...formFor(arId), ...patch },
    }));
  }

  function pay(arId: string) {
    setFlash(null);
    setError(null);
    const f = formFor(arId);
    const result = recordArPayment(arId, f.amount, f.date, f.note);
    if (!result.ok) {
      setError(result.message ?? "收款失敗");
      return;
    }
    setFlash(result.message ?? "已收款");
    setPayForms((prev) => ({
      ...prev,
      [arId]: { amount: "", date: todayLocalDate(), note: "" },
    }));
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="應收帳款" description="第 12 週" />
        <Notice kind="info">正在載入本機資料…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="應收帳款"
        description="出貨產生應收 · 登記收款 · 未收餘額（第 12 週｜非營所稅）"
        actions={
          <Link href="/orders/" className="btn-ghost text-sm">
            訂單
          </Link>
        }
      />

      <Notice kind="info">
        於「出貨」確認或訂單改為「已出貨」時自動建立應收（Amount＝訂單金額）。可登記部分／全額收款並更新狀態。本模組為配銷應收，不含企業營所稅計算。
      </Notice>

      <section
        className="kpi-band grid grid-cols-2 border border-[var(--border)] lg:grid-cols-4"
        aria-label="應收摘要"
      >
        {[
          { label: "有效應收筆數", value: String(totals.count), unit: "筆" },
          {
            label: "應收總額",
            value: formatTwd(totals.amount),
            unit: "元",
          },
          { label: "已收合計", value: formatTwd(totals.paid), unit: "元" },
          {
            label: "未收餘額",
            value: formatTwd(totals.due),
            unit: "元",
          },
        ].map((k, i) => (
          <div
            key={k.label}
            className={`kpi-cell px-3.5 py-3.5 sm:px-5 sm:py-4 ${
              i < 2 ? "border-b border-[var(--border-soft)] lg:border-b-0" : ""
            } ${i % 2 === 0 ? "border-r border-[var(--border-soft)]" : ""} ${
              i < 3 ? "lg:border-r lg:border-[var(--border-soft)]" : ""
            }`}
          >
            <p className="text-[11px] tracking-[0.06em] text-[var(--muted)]">
              {k.label}
            </p>
            <p className="font-display mt-1.5 flex items-baseline gap-1 text-[1.45rem] font-semibold tabular-nums text-[var(--brand)]">
              {k.value}
              <span className="text-xs font-normal text-[var(--muted)]">
                {k.unit}
              </span>
            </p>
          </div>
        ))}
      </section>

      {flash && (
        <div className="animate-success-flash">
          <Notice kind="info">{flash}</Notice>
        </div>
      )}
      {error && (
        <Notice kind="error" title="無法收款">
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs text-[var(--muted)]">
          狀態
          <select
            className="field mt-1 text-sm"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as (typeof STATUS_FILTER)[number])
            }
          >
            {STATUS_FILTER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[12rem] flex-1 text-xs text-[var(--muted)]">
          搜尋
          <input
            className="field mt-1 w-full text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="AR／訂單／客戶"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <Notice kind="empty">沒有符合的應收</Notice>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const due = outstandingOf(r);
            const relatedPays = payments
              .filter((p) => p.AR_ID === r.AR_ID)
              .sort((a, b) => b.Pay_Date.localeCompare(a.Pay_Date));
            const f = formFor(r.AR_ID);
            const canPay =
              r.Status === "未收" || r.Status === "部分收款";
            return (
              <article
                key={r.AR_ID}
                className="surface-panel border border-[var(--border)] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-[var(--muted)]">
                      {r.AR_ID}
                    </p>
                    <h3 className="mt-1 font-display text-base font-semibold text-[var(--brand-deep)]">
                      {r.Customer_ID} {customerName(r.Customer_ID)}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      發票日 {r.Invoice_Date} · 訂單{" "}
                      <Link
                        href={`/orders/${r.Order_ID}/`}
                        className="text-[var(--brand)] underline-offset-2 hover:underline"
                      >
                        {r.Order_ID}
                      </Link>{" "}
                      · {r.Status}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-[var(--muted)]">應收／已收／未收</p>
                    <p className="mt-1 tabular-nums">
                      NT$ {formatTwd(r.Amount)} · {formatTwd(r.Paid_Amount)} ·{" "}
                      <span className="font-semibold text-[var(--brand)]">
                        {formatTwd(due)}
                      </span>
                    </p>
                  </div>
                </div>

                {relatedPays.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--muted)]">
                    {relatedPays.map((p) => (
                      <li key={p.Payment_ID}>
                        {p.Payment_ID} · {p.Pay_Date} · NT${" "}
                        {formatTwd(p.Amount)}
                        {p.Note ? ` · ${p.Note}` : ""}
                      </li>
                    ))}
                  </ul>
                )}

                {canPay && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--border-soft)] pt-3">
                    <label className="text-xs text-[var(--muted)]">
                      收款金額
                      <input
                        className="field mt-1 w-28 text-sm"
                        inputMode="numeric"
                        value={f.amount}
                        onChange={(e) =>
                          setForm(r.AR_ID, { amount: e.target.value })
                        }
                        placeholder={`最多 ${due}`}
                      />
                    </label>
                    <label className="text-xs text-[var(--muted)]">
                      收款日
                      <input
                        type="date"
                        className="field mt-1 text-sm"
                        value={f.date}
                        onChange={(e) =>
                          setForm(r.AR_ID, { date: e.target.value })
                        }
                      />
                    </label>
                    <label className="min-w-[8rem] flex-1 text-xs text-[var(--muted)]">
                      備註
                      <input
                        className="field mt-1 w-full text-sm"
                        value={f.note}
                        onChange={(e) =>
                          setForm(r.AR_ID, { note: e.target.value })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      onClick={() => pay(r.AR_ID)}
                    >
                      登記收款
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
