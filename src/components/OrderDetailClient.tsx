"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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
    setOrderStatus,
    customerName,
    productName,
  } = useApp();

  const order = orders.find((o) => o.Order_ID === orderId);
  const details = orderDetails.filter((d) => d.Order_ID === orderId);
  const detailSum = details.reduce((s, d) => s + d.Subtotal, 0);

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
            onChange={(e) =>
              setOrderStatus(order.Order_ID, e.target.value as OrderStatus)
            }
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
      </div>

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
                  明細合計（應等於表頭）
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
