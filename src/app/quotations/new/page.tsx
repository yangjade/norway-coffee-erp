"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import {
  TAX_RATE,
  addDays,
  computeQuoteTotals,
  todayLocalDate,
} from "@/lib/quotation-rules";
import { Notice, PageHeader } from "@/components/Notice";

type DraftLine = { Product_ID: string; Qty: number };

export default function NewQuotationPage() {
  const router = useRouter();
  const {
    customers,
    products,
    createQuote,
    currentUser,
    peekNextQuoteId,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const activeCustomers = useMemo(
    () => customers.filter((c) => c.Is_Active),
    [customers],
  );
  const activeProducts = useMemo(
    () => products.filter((p) => p.Is_Active),
    [products],
  );

  const [customerId, setCustomerId] = useState(
    activeCustomers[0]?.Customer_ID ?? "",
  );
  const [quoteDate, setQuoteDate] = useState(todayLocalDate());
  const [validUntil, setValidUntil] = useState(addDays(todayLocalDate(), 14));
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { Product_ID: activeProducts[0]?.Product_ID ?? "P001", Qty: 1 },
  ]);
  const [msg, setMsg] = useState<string | null>(null);

  const previewLines = lines.map((l) => {
    const p = products.find((x) => x.Product_ID === l.Product_ID);
    const unit = p?.List_Price ?? 0;
    return {
      ...l,
      name: p?.Product_Name ?? l.Product_ID,
      Unit_Price: unit,
      Line_Amount: l.Qty * unit,
    };
  });
  const discNum = Number.parseInt(discount || "0", 10) || 0;
  const totals = computeQuoteTotals(previewLines, discNum);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const result = createQuote({
      Customer_ID: customerId,
      Quote_Date: quoteDate,
      Valid_Until: validUntil,
      Discount_Amount: discount,
      Notes: notes,
      lines: lines.map((l) => ({
        Product_ID: l.Product_ID,
        Qty: l.Qty,
      })),
    });
    if (!result.ok) {
      setMsg(result.message ?? "建立失敗");
      return;
    }
    router.push(`/quotations/${result.quotation!.Quote_ID}/`);
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="新增報價"
        description={`下一編號 ${peekNextQuoteId()} · 帶入 List_Price 快照 · Tax ${TAX_RATE * 100}% 依元四捨五入${!isAdmin ? " · Staff 不可改預設單價" : ""}`}
        actions={
          <Link
            href="/quotations/"
            className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
          >
            返回列表
          </Link>
        }
      />

      {activeCustomers.length === 0 && (
        <Notice kind="empty">沒有啟用客戶，無法建立報價。</Notice>
      )}

      <form
        onSubmit={onSubmit}
        className="surface-panel space-y-4 border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--muted)]">客戶 *</span>
            <select
              className="field w-full"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              {activeCustomers.map((c) => (
                <option key={c.Customer_ID} value={c.Customer_ID}>
                  {c.Customer_ID} {c.Customer_Name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--muted)]">整單折扣（元）</span>
            <input
              className="field w-full tabular-nums"
              type="number"
              min={0}
              step={1}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--muted)]">報價日 *</span>
            <input
              className="field w-full"
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-[var(--muted)]">有效期限 *</span>
            <input
              className="field w-full"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-[var(--muted)]">備註</span>
          <input
            className="field w-full"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base text-[var(--brand)]">明細</h3>
            <button
              type="button"
              className="text-xs text-[var(--brand)] underline"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    Product_ID: activeProducts[0]?.Product_ID ?? "P001",
                    Qty: 1,
                  },
                ])
              }
            >
              ＋加列
            </button>
          </div>
          {previewLines.map((line, idx) => (
            <div
              key={idx}
              className="grid gap-2 border border-[var(--border-soft)] bg-[var(--paper)]/70 p-2.5 sm:grid-cols-[1.4fr_5rem_6rem_6rem_auto]"
            >
              <select
                className="field"
                value={line.Product_ID}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, Product_ID: e.target.value } : l,
                    ),
                  )
                }
              >
                {activeProducts.map((p) => (
                  <option key={p.Product_ID} value={p.Product_ID}>
                    {p.Product_ID} {p.Product_Name}（{formatTwd(p.List_Price)}）
                  </option>
                ))}
              </select>
              <input
                className="field tabular-nums"
                type="number"
                min={1}
                step={1}
                value={line.Qty}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx
                        ? {
                            ...l,
                            Qty: Math.max(
                              1,
                              Number.parseInt(e.target.value || "1", 10) || 1,
                            ),
                          }
                        : l,
                    ),
                  )
                }
                aria-label="數量"
              />
              <div className="flex items-center text-xs tabular-nums text-[var(--muted)]">
                @{formatTwd(line.Unit_Price)}
              </div>
              <div className="flex items-center text-sm tabular-nums font-medium">
                {formatTwd(line.Line_Amount)}
              </div>
              <button
                type="button"
                className="text-xs text-[var(--danger)]"
                disabled={lines.length <= 1}
                onClick={() =>
                  setLines((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                刪列
              </button>
            </div>
          ))}
        </div>

        <div className="totals-rail border border-[var(--border)] bg-[var(--linen)]/55 px-4 py-3 text-sm">
          <Row label="小計 Subtotal" value={totals.Subtotal} />
          <Row label="折扣 Discount" value={-Math.min(discNum, totals.Subtotal)} />
          <Row label="未稅稅基" value={totals.Taxable_Base} />
          <Row label="稅額 5%（依元）" value={totals.Tax_Amount} />
          <Row label="總額 Total" value={totals.Total} strong />
        </div>

        {msg && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {msg}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="btn-primary"
            disabled={!customerId || activeCustomers.length === 0}
          >
            建立 Draft 報價
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => router.push("/quotations/")}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="text-[var(--muted)]">{label}</span>
      <span
        className={`tabular-nums ${
          strong ? "font-semibold text-[var(--brand)]" : ""
        }`}
      >
        NT$ {formatTwd(value)}
      </span>
    </div>
  );
}
