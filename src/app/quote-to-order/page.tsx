"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice, PageHeader } from "@/components/Notice";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import {
  orderAlreadyFromQuote,
  ORDER_STATUS_RULES_ZH,
  WEEK8_BUSINESS_DATE,
} from "@/lib/order-rules";
import { statusLabel } from "@/lib/quotation-rules";

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
  const [asOf] = useState(WEEK8_BUSINESS_DATE);

  const candidates = useMemo(
    () =>
      [...quotations].sort((a, b) => b.Quote_Date.localeCompare(a.Quote_Date)),
    [quotations],
  );

  function handleConvert(quoteId: string) {
    setFlash(null);
    setError(null);
    const result = convertAcceptedQuote(quoteId, {
      asOfDate: asOf,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    if (!result.ok || !result.order) {
      setError(result.message ?? "轉單失敗");
      return;
    }
    setFlash(result.message ?? "已轉單");
    router.push(`/orders/${result.order.Order_ID}/`);
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="報價轉訂單" description="第 8 週" />
        <Notice kind="info">載入中…</Notice>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 animate-rise"
      data-week8="quote-to-order"
      data-week8-marker="week8-official-20261118"
    >
      <PageHeader
        title="報價轉訂單"
        description="已接受且未逾期 → Draft 訂單；快照單價／折扣；業務日固定 2026-11-18"
        actions={
          <Link href="/orders/" className="btn-ghost text-sm">
            訂單列表
          </Link>
        }
      />

      <Notice kind="info">
        業務日（asOf）={asOf}。案例 QT-20261118-001 轉單總額應為 7,560。同報價連按回原單。確認訂單不扣庫。
      </Notice>

      <div className="panel px-4 py-3 text-xs text-[var(--muted)]">
        <ul className="list-disc pl-4">
          {ORDER_STATUS_RULES_ZH.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      {flash && <Notice kind="info">{flash}</Notice>}
      {error && (
        <Notice kind="error" title="無法轉單">
          {error}
        </Notice>
      )}

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Quote_ID</th>
              <th>客戶</th>
              <th>有效至</th>
              <th>狀態</th>
              <th>總額</th>
              <th>連結訂單</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((q) => {
              const linked = orderAlreadyFromQuote(orders, q.Quote_ID);
              const expired = q.Valid_Until < asOf;
              const cust = customers.find((c) => c.Customer_ID === q.Customer_ID);
              const lines = quotationDetails.filter((d) => d.Quote_ID === q.Quote_ID);
              const inactive = lines.some((d) => {
                const p = products.find((x) => x.Product_ID === d.Product_ID);
                return !p?.Is_Active;
              });
              const can =
                q.Status === "Accepted" &&
                !expired &&
                cust?.Is_Active &&
                !inactive;
              return (
                <tr key={q.Quote_ID}>
                  <td>
                    <Link
                      href={`/quotations/${q.Quote_ID}/`}
                      className="font-mono text-xs text-[var(--brand)] underline"
                    >
                      {q.Quote_ID}
                    </Link>
                  </td>
                  <td>
                    {q.Customer_ID} {customerName(q.Customer_ID)}
                  </td>
                  <td>{q.Valid_Until}</td>
                  <td>
                    {statusLabel(q.Status)}
                    {expired ? " · 逾期" : ""}
                  </td>
                  <td className="tabular-nums">NT$ {formatTwd(q.Total)}</td>
                  <td>
                    {linked ? (
                      <Link
                        href={`/orders/${linked.Order_ID}/`}
                        className="font-mono text-xs text-[var(--brand)] underline"
                      >
                        {linked.Order_ID}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-primary text-xs"
                      onClick={() => handleConvert(q.Quote_ID)}
                    >
                      {linked ? "開啟原訂單" : "轉成訂單"}
                    </button>
                    {!linked && !can && (
                      <span className="ml-2 text-xs text-[var(--danger)]">
                        {q.Status !== "Accepted"
                          ? "尚未接受"
                          : expired
                            ? "已逾期"
                            : inactive
                              ? "停用商品"
                              : "客戶停用"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
