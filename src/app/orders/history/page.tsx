"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";

/** 歷史訂單 (W06)：偏早期／已結束單，與 W08 銷售訂單列表分開 */
export default function OrderHistoryPage() {
  const { orders, customerName, hydrated } = useApp();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...orders]
      .filter(
        (o) =>
          o.Order_Status === "Cancelled" ||
          o.Stock_Deducted ||
          o.Order_Date < "2026-11-01",
      )
      .filter((o) => {
        if (!needle) return true;
        return (
          o.Order_ID.toLowerCase().includes(needle) ||
          o.Customer_ID.toLowerCase().includes(needle) ||
          customerName(o.Customer_ID).toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.Order_Date.localeCompare(a.Order_Date));
  }, [orders, q, customerName]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="歷史訂單" />
        <Notice kind="info">載入中…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="歷史訂單 (W06)"
        description="已取消、已出貨或較早日期的訂單。進行中請用「銷售訂單 (W08)」。"
        actions={
          <Link href="/orders/" className="btn-primary text-sm">
            銷售訂單 (W08)
          </Link>
        }
      />
      <input
        className="field max-w-md text-sm"
        placeholder="搜尋歷史訂單／客戶"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {rows.length === 0 ? (
        <Notice kind="empty">目前沒有歷史訂單</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>訂單編號</th>
                <th>客戶</th>
                <th>訂單日期</th>
                <th>狀態</th>
                <th>含稅總額</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.Order_ID}>
                  <td className="font-mono text-xs">{o.Order_ID}</td>
                  <td>
                    {o.Customer_ID}｜{customerName(o.Customer_ID)}
                  </td>
                  <td>{o.Order_Date}</td>
                  <td>
                    <StatusBadge status={o.Order_Status} />
                    {o.Stock_Deducted ? (
                      <span className="ml-1 text-[10px] text-[var(--muted)]">
                        已出貨
                      </span>
                    ) : null}
                  </td>
                  <td className="tabular-nums">NT$ {formatTwd(o.Total_Amount)}</td>
                  <td>
                    <Link
                      href={`/orders/${o.Order_ID}/`}
                      className="btn-ghost text-xs"
                    >
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
