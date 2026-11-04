"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Notice, PageHeader } from "@/components/Notice";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["待確認", "處理中", "已出貨", "已取消"];

export default function OrdersPage() {
  const { orders, setOrderStatus, currentUser, customerName, simLoadError } =
    useApp();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="訂單"
        description="點選 Order_ID 查看明細；改為已出貨會扣庫並產生應收 · 來源報價可連回"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/quote-to-order/"
              className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
            >
              報價轉訂單
            </Link>
            <Link
              href="/"
              className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
            >
              返回首頁
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        變更訂單狀態後，首頁 KPI、庫存、應收會同步；資料寫入本機
        localStorage。目前身分：{currentUser.User_Name}。庫存不足時無法出貨。
      </Notice>

      {error && (
        <Notice kind="error" title="狀態更新失敗">
          {error}
        </Notice>
      )}

      {simLoadError ? (
        <Notice kind="error" title="載入失敗，請重試">
          此為模擬測試「載入失敗」狀態（與無訂單／無權限分開顯示）。請按下方「恢復原始樣本」或再次載入。
        </Notice>
      ) : null}

      {simLoadError ? null : orders.length === 0 ? (
        <Notice kind="empty">目前沒有符合條件的訂單</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Order_ID</th>
                <th>日期</th>
                <th>客戶</th>
                <th>來源報價</th>
                <th>狀態</th>
                <th>金額</th>
                <th>調整狀態</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.Order_ID}>
                  <td>
                    <Link
                      href={`/orders/${o.Order_ID}`}
                      className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                    >
                      {o.Order_ID}
                    </Link>
                  </td>
                  <td>{o.Order_Date}</td>
                  <td>
                    {o.Customer_ID} {customerName(o.Customer_ID)}
                  </td>
                  <td>
                    {o.Quote_ID ? (
                      <Link
                        href={`/quotations/${o.Quote_ID}/`}
                        className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                      >
                        {o.Quote_ID}
                      </Link>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={o.Order_Status} />
                  </td>
                  <td className="tabular-nums">
                    NT$ {formatTwd(o.Total_Amount)}
                  </td>
                  <td>
                    <select
                      className="field text-xs"
                      value={o.Order_Status}
                      aria-label={`調整 ${o.Order_ID} 狀態`}
                      onChange={(e) => {
                        const result = setOrderStatus(
                          o.Order_ID,
                          e.target.value as OrderStatus,
                        );
                        setError(result.ok ? null : (result.message ?? "失敗"));
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
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
