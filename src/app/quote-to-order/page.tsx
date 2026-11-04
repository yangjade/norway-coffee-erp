"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { orderAlreadyFromQuote } from "@/lib/order-rules";
import { statusLabel } from "@/lib/quotation-rules";
import { Notice, PageHeader } from "@/components/Notice";

export default function QuoteToOrderPage() {
  const router = useRouter();
  const {
    quotations,
    quotationDetails,
    orders,
    customers,
    products,
    convertAcceptedQuote,
    customerName,
    hydrated,
  } = useApp();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accepted = useMemo(
    () =>
      quotations
        .filter((q) => q.Status === "Accepted")
        .sort((a, b) => b.Quote_Date.localeCompare(a.Quote_Date)),
    [quotations],
  );

  function canConvert(quoteId: string, customerId: string) {
    const linked = orderAlreadyFromQuote(orders, quoteId);
    if (linked) return { ok: false as const, reason: `已轉 ${linked.Order_ID}` };
    const cust = customers.find((c) => c.Customer_ID === customerId);
    if (!cust?.Is_Active) {
      return { ok: false as const, reason: "客戶已停用" };
    }
    const lines = quotationDetails.filter((d) => d.Quote_ID === quoteId);
    const inactive = lines.filter((d) => {
      const p = products.find((x) => x.Product_ID === d.Product_ID);
      return !p || !p.Is_Active;
    });
    if (inactive.length) {
      return {
        ok: false as const,
        reason: `含停用商品 ${inactive.map((d) => d.Product_ID).join("、")}`,
      };
    }
    return { ok: true as const };
  }

  function handleConvert(quoteId: string) {
    setFlash(null);
    setError(null);
    const result = convertAcceptedQuote(quoteId);
    if (!result.ok || !result.order) {
      setError(result.message ?? "轉單失敗");
      return;
    }
    setFlash(result.message ?? "已轉單");
    router.push(`/orders/${result.order.Order_ID}/`);
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="報價轉訂單" description="第 8 週" />
        <Notice kind="info">正在載入本機資料…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="報價轉訂單"
        description="Accepted 報價 → Sales_Order＋明細（複製客戶／Qty／Unit_Price 快照）· 第 8 週"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/quotations/" className="btn-ghost text-sm">
              報價列表
            </Link>
            <Link href="/orders/" className="btn-ghost text-sm">
              訂單列表
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        僅狀態為 Accepted 的報價可轉單；停用客戶或明細含停用商品時會拒絕。同一報價不可重複轉換。轉出訂單預設「待確認」，可再到訂單改狀態／出貨扣庫。
      </Notice>

      {flash && (
        <div className="animate-success-flash">
          <Notice kind="info">{flash}</Notice>
        </div>
      )}
      {error && (
        <Notice kind="error" title="無法轉單">
          {error}
        </Notice>
      )}

      {accepted.length === 0 ? (
        <Notice kind="empty" title="尚無 Accepted 報價">
          請先到報價詳細將 Sent 報價標為 Accepted（管理者），再回來轉單。樣本
          Q003 為 Accepted 可直接試轉。
          <div className="mt-3">
            <Link href="/quotations/" className="btn-primary">
              前往報價
            </Link>
          </div>
        </Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Quote_ID</th>
                <th>客戶</th>
                <th>報價日</th>
                <th>狀態</th>
                <th>總額</th>
                <th>連結訂單</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {accepted.map((q) => {
                const linked = orderAlreadyFromQuote(orders, q.Quote_ID);
                const gate = canConvert(q.Quote_ID, q.Customer_ID);
                return (
                  <tr key={q.Quote_ID}>
                    <td>
                      <Link
                        href={`/quotations/${q.Quote_ID}/`}
                        className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                      >
                        {q.Quote_ID}
                      </Link>
                    </td>
                    <td>
                      {q.Customer_ID} {customerName(q.Customer_ID)}
                    </td>
                    <td>{q.Quote_Date}</td>
                    <td>{statusLabel(q.Status)}</td>
                    <td className="tabular-nums">
                      NT$ {formatTwd(q.Total)}
                    </td>
                    <td>
                      {linked ? (
                        <Link
                          href={`/orders/${linked.Order_ID}/`}
                          className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                        >
                          {linked.Order_ID}
                        </Link>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td>
                      {linked ? (
                        <span className="text-xs text-[var(--muted)]">
                          已轉換
                        </span>
                      ) : gate.ok ? (
                        <button
                          type="button"
                          className="btn-primary text-xs"
                          onClick={() => handleConvert(q.Quote_ID)}
                        >
                          轉成訂單
                        </button>
                      ) : (
                        <span
                          className="text-xs text-[var(--danger)]"
                          title={gate.reason}
                        >
                          {gate.reason}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
