"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Notice, PageHeader } from "@/components/Notice";
import { ClassroomSim } from "@/components/ClassroomSim";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["待確認", "處理中", "已出貨", "已取消"];

export default function OrdersPage() {
  const { orders, setOrderStatus, currentUser, customerName, simLoadError } = useApp();

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="訂單"
        description="樣本列表 · 點選 Order_ID 查看明細；Admin／Staff 皆可調整狀態以驗證 KPI 同步"
        actions={
          <Link
            href="/"
            className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
          >
            返回首頁
          </Link>
        }
      />

      <Notice kind="info">
        變更訂單狀態後，首頁 KPI、待出貨清單、詳情頁會立刻一致；資料寫入本機
        localStorage，重新整理後仍保留。目前身分：{currentUser.User_Name}。
      </Notice>

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
                      onChange={(e) =>
                        setOrderStatus(
                          o.Order_ID,
                          e.target.value as OrderStatus,
                        )
                      }
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

      <ClassroomSim />
    </div>
  );
}
