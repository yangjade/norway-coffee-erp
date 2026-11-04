"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Notice, PageHeader } from "@/components/Notice";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["待確認", "處理中", "已出貨", "已取消"];

export default function OrderDetailClient() {
  const params = useParams();
  const orderId = String(params.orderId ?? "");
  const {
    orders,
    orderDetails,
    receivables,
    setOrderStatus,
    customerName,
    productName,
  } = useApp();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const order = orders.find((o) => o.Order_ID === orderId);
  const details = orderDetails.filter((d) => d.Order_ID === orderId);
  const detailSum = details.reduce((s, d) => s + d.Subtotal, 0);
  const ar = receivables.find(
    (r) => r.Order_ID === orderId && r.Status !== "已作廢",
  );

  if (!order) {
    return (
      <div className="mx-auto max-w-xl space-y-4 animate-rise">
        <PageHeader title="訂單詳情" />
        <Notice kind="empty" title={`找不到訂單「${orderId}」`} showHomeLink>
          Order_ID 不存在於樣本資料。
          <div className="mt-3">
            <Link
              href="/orders"
              className="text-[var(--brand)] underline-offset-2 hover:underline"
            >
              返回訂單列表
            </Link>
          </div>
        </Notice>
      </div>
    );
  }

  function changeStatus(next: OrderStatus) {
    setFlash(null);
    setError(null);
    const result = setOrderStatus(order!.Order_ID, next);
    if (!result.ok) {
      setError(result.message ?? "狀態更新失敗");
      return;
    }
    setFlash(result.message ?? "已更新");
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title={`訂單 ${order.Order_ID}`}
        description={`表頭 1 筆 · 明細 ${details.length} 筆 · 金額以表頭為準`}
        actions={
          <>
            <Link
              href="/orders"
              className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
            >
              返回訂單列表
            </Link>
            <Link
              href="/"
              className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
            >
              返回首頁
            </Link>
          </>
        }
      />

      {flash && (
        <div className="animate-success-flash">
          <Notice kind="info">{flash}</Notice>
        </div>
      )}
      {error && (
        <Notice kind="error" title="無法更新狀態">
          {error}
        </Notice>
      )}

      <div className="panel grid gap-2 px-4 py-3.5 text-sm sm:grid-cols-2">
        <p>
          <span className="text-[var(--muted)]">日期</span> {order.Order_Date}
        </p>
        <p>
          <span className="text-[var(--muted)]">客戶</span>{" "}
          {order.Customer_ID} {customerName(order.Customer_ID)}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-[var(--muted)]">狀態</span>
          <StatusBadge status={order.Order_Status} />
          <select
            className="field text-xs"
            value={order.Order_Status}
            aria-label={`調整 ${order.Order_ID} 狀態`}
            onChange={(e) => changeStatus(e.target.value as OrderStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </p>
        <p>
          <span className="text-[var(--muted)]">表頭金額</span>{" "}
          <span className="font-semibold tabular-nums">
            NT$ {formatTwd(order.Total_Amount)}
          </span>
        </p>
        <p>
          <span className="text-[var(--muted)]">來源報價</span>{" "}
          {order.Quote_ID ? (
            <Link
              href={`/quotations/${order.Quote_ID}/`}
              className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
            >
              {order.Quote_ID}
            </Link>
          ) : (
            <span className="text-[var(--muted)]">—（樣本／手動）</span>
          )}
        </p>
        <p>
          <span className="text-[var(--muted)]">庫存／應收</span>{" "}
          {order.Stock_Deducted ? "已扣庫" : "未扣庫"}
          {ar ? (
            <>
              {" · "}
              <Link
                href="/receivables/"
                className="text-[var(--brand)] underline-offset-2 hover:underline"
              >
                {ar.AR_ID}（{ar.Status}）
              </Link>
            </>
          ) : (
            " · 尚無應收"
          )}
        </p>
      </div>

      {order.Order_Status === "已出貨" && (
        <Notice kind="info">
          已出貨：庫存已依明細扣減；應收見上方連結。改回其他狀態會嘗試還原庫存並作廢未收款應收。
        </Notice>
      )}

      {details.length === 0 ? (
        <Notice kind="empty">此訂單目前沒有明細列</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Detail_ID</th>
                <th>商品</th>
                <th>Qty</th>
                <th>Unit_Price</th>
                <th>Discount</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.Detail_ID}>
                  <td className="font-mono text-xs">{d.Detail_ID}</td>
                  <td>
                    {d.Product_ID} {productName(d.Product_ID)}
                  </td>
                  <td className="tabular-nums">{d.Qty}</td>
                  <td className="tabular-nums">{formatTwd(d.Unit_Price)}</td>
                  <td className="tabular-nums">{d.Discount}</td>
                  <td className="tabular-nums">{formatTwd(d.Subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={5}
                  className="text-right text-xs text-[var(--muted)]"
                >
                  明細合計（應等於表頭；轉單可含稅總額）
                </td>
                <td className="font-semibold tabular-nums">
                  NT$ {formatTwd(detailSum)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
