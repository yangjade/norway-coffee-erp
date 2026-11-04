"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { isAmountLocked, statusLabel } from "@/lib/quotation-rules";
import type { QuoteStatus } from "@/lib/types";
import { Notice, PageHeader } from "@/components/Notice";

export default function QuotationDetailPage() {
  const params = useParams();
  const quoteId = String(params.quoteId ?? "");
  const {
    quotations,
    quotationDetails,
    orders,
    customerName,
    setQuoteStatus,
    convertAcceptedQuote,
    currentUser,
    hydrated,
  } = useApp();
  const router = useRouter();
  const quote = quotations.find((q) => q.Quote_ID === quoteId);
  const details = quotationDetails
    .filter((d) => d.Quote_ID === quoteId)
    .sort((a, b) => a.Line_No - b.Line_No);
  const isAdmin = currentUser.Role === "Admin";
  const [flash, setFlash] = useState<string | null>(null);
  const linkedOrder = orders.find((o) => o.Quote_ID === quoteId);

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="載入報價…" description={quoteId} />
        <Notice kind="info">正在載入本機資料…</Notice>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="報價不存在" description={quoteId} />
        <Notice kind="empty">找不到此報價編號，可能尚未建立或已被重設樣本。</Notice>
        <Link href="/quotations/" className="btn-primary">
          返回報價列表
        </Link>
      </div>
    );
  }

  const locked = isAmountLocked(quote.Status);

  function act(next: QuoteStatus) {
    const r = setQuoteStatus(quoteId, next);
    setFlash(r.ok ? (r.message ?? "已更新") : (r.message ?? "失敗"));
  }

  function convert() {
    const r = convertAcceptedQuote(quoteId);
    setFlash(r.message ?? (r.ok ? "已轉單" : "轉單失敗"));
    if (r.ok && r.order) {
      router.push(`/orders/${r.order.Order_ID}/`);
    }
  }

  return (
    <div className="space-y-5 animate-rise quote-print-root">
      <div className="no-print">
        <PageHeader
          title={quote.Quote_ID}
          description={`${quote.Customer_ID} ${customerName(quote.Customer_ID)} · ${statusLabel(quote.Status)} · 有效至 ${quote.Valid_Until}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => window.print()}
              >
                列印／預覽
              </button>
              <Link href="/quotations/" className="btn-ghost text-sm">
                返回報價列表
              </Link>
            </div>
          }
        />
      </div>

      <div className="print-only print-brand">
        <p className="brand-wordmark text-2xl">挪威的咖啡</p>
        <p className="text-sm text-[var(--muted)]">報價單 · {quote.Quote_ID}</p>
      </div>

      {flash && (
        <div className="animate-success-flash no-print">
          <Notice kind="info">{flash}</Notice>
        </div>
      )}

      {locked && (
        <div className="no-print">
          <Notice kind="info">
            金額已鎖定（{quote.Status}）。重報請新增報價；主檔 List_Price
            變更不會覆寫本單 Unit_Price 快照。
          </Notice>
        </div>
      )}

      <section className="space-y-2" aria-label="報價表頭">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          報價表頭
        </h2>
        <div className="surface-panel grid gap-3 border border-[var(--border)] p-4 sm:grid-cols-2 sm:p-5">
          <Item label="Quote_ID" value={quote.Quote_ID} />
          <Item
            label="狀態 Status"
            value={`${quote.Status}（${statusLabel(quote.Status)}）`}
          />
          <Item
            label="客戶"
            value={`${quote.Customer_ID} ${customerName(quote.Customer_ID)}`}
          />
          <Item label="有效期限 Valid_Until" value={quote.Valid_Until} />
          <Item label="報價日 Quote_Date" value={quote.Quote_Date} />
          <Item label="稅率 Tax_Rate" value={`${quote.Tax_Rate * 100}%`} />
          <div className="sm:col-span-2">
            <Item label="備註" value={quote.Notes || "—"} />
          </div>
        </div>
      </section>

      <section className="space-y-2" aria-label="報價明細">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          報價明細（Unit_Price 快照）
        </h2>
        {details.length === 0 ? (
          <Notice kind="empty">此報價尚無明細列。</Notice>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>行</th>
                  <th>商品</th>
                  <th>快照名稱</th>
                  <th>Qty</th>
                  <th>Unit_Price</th>
                  <th>Line_Amount</th>
                </tr>
              </thead>
              <tbody>
                {details.map((d) => (
                  <tr key={`${d.Quote_ID}-${d.Line_No}`}>
                    <td>{d.Line_No}</td>
                    <td className="font-mono text-xs">{d.Product_ID}</td>
                    <td>{d.Product_Name_Snapshot}</td>
                    <td className="tabular-nums">{d.Qty}</td>
                    <td className="tabular-nums">
                      NT$ {formatTwd(d.Unit_Price)}
                    </td>
                    <td className="tabular-nums">
                      NT$ {formatTwd(d.Line_Amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2" aria-label="金額合計">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          金額合計
        </h2>
        <div className="totals-rail border border-[var(--border)] px-4 py-3 text-sm">
          <MoneyRow label="小計 Subtotal" value={quote.Subtotal} />
          <MoneyRow
            label="折扣 Discount_Amount"
            value={-quote.Discount_Amount}
          />
          <MoneyRow
            label="未稅稅基"
            value={quote.Subtotal - quote.Discount_Amount}
          />
          <MoneyRow
            label="稅額 Tax_Amount（依元）"
            value={quote.Tax_Amount}
          />
          <MoneyRow label="總額 Total" value={quote.Total} strong />
        </div>
      </section>

      <div className="no-print flex flex-wrap gap-2">
        {quote.Status === "Draft" && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => act("Sent")}
          >
            送出（Sent）
          </button>
        )}
        {quote.Status === "Sent" && isAdmin && (
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => act("Accepted")}
            >
              接受
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => act("Rejected")}
            >
              拒絕
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => act("Expired")}
            >
              標示到期
            </button>
          </>
        )}
        {quote.Status === "Sent" && !isAdmin && (
          <p className="text-xs text-[var(--muted)]">
            Staff 可送出；接受／拒絕／到期僅管理者。
          </p>
        )}
        {quote.Status === "Accepted" && !linkedOrder && (
          <button type="button" className="btn-primary" onClick={convert}>
            轉成訂單
          </button>
        )}
        {linkedOrder && (
          <Link
            href={`/orders/${linkedOrder.Order_ID}/`}
            className="btn-primary"
          >
            已轉 {linkedOrder.Order_ID}
          </Link>
        )}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => window.print()}
        >
          列印／預覽
        </button>
        <Link href="/quote-to-order/" className="btn-ghost">
          報價轉訂單
        </Link>
        <Link href="/quotations/new/" className="btn-ghost">
          開新報價（重報）
        </Link>
        <Link href="/quotations/" className="btn-primary">
          返回報價列表
        </Link>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--brand-deep)]">{value}</p>
    </div>
  );
}

function MoneyRow({
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
