"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Notice, PageHeader } from "@/components/Notice";
import { PrimaryActionBar } from "@/components/PrimaryActionBar";
import { PrintActions, PrintSheet } from "@/components/PrintSheet";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { buildActivityFeed } from "@/lib/activity";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["待確認", "處理中", "已出貨", "已取消"];

export default function OrderDetailClient() {
  const params = useParams();
  const orderId = String(params.orderId ?? "");
  const {
    orders,
    orderDetails,
    receivables,
    payments,
    quotations,
    stockMoves,
    setOrderStatus,
    customerName,
    productName,
  } = useApp();
  const { pushToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const order = orders.find((o) => o.Order_ID === orderId);
  const details = orderDetails.filter((d) => d.Order_ID === orderId);
  const detailSum = details.reduce((s, d) => s + d.Subtotal, 0);
  const ar = receivables.find(
    (r) => r.Order_ID === orderId && r.Status !== "已作廢",
  );

  const timeline = useMemo(() => {
    if (!order) return [];
    const relatedOrders = orders.filter((o) => o.Order_ID === orderId);
    const relatedQuotes = order.Quote_ID
      ? quotations.filter((q) => q.Quote_ID === order.Quote_ID)
      : [];
    const relatedAr = receivables.filter((r) => r.Order_ID === orderId);
    const relatedPay = payments.filter((p) =>
      relatedAr.some((r) => r.AR_ID === p.AR_ID),
    );
    const relatedMoves = stockMoves.filter((m) => m.Ref_Order_ID === orderId);
    return buildActivityFeed({
      orders: relatedOrders,
      quotations: relatedQuotes,
      receivables: relatedAr,
      payments: relatedPay,
      stockMoves: relatedMoves,
      customerName,
      limit: 8,
    });
  }, [
    order,
    orderId,
    orders,
    quotations,
    receivables,
    payments,
    stockMoves,
    customerName,
  ]);

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
    setError(null);
    const result = setOrderStatus(order!.Order_ID, next);
    if (!result.ok) {
      setError(result.message ?? "狀態更新失敗");
      pushToast({
        tone: "error",
        title: "無法更新狀態",
        message: result.message ?? "失敗",
      });
      return;
    }
    pushToast({
      tone: "success",
      message: result.message ?? "已更新",
    });
  }

  return (
    <PrintSheet
      docTitle="銷售訂單"
      docId={order.Order_ID}
      meta={
        <>
          {order.Order_Date} · {order.Customer_ID}{" "}
          {customerName(order.Customer_ID)}
        </>
      }
    >
      <div className="space-y-5 animate-rise">
        <div className="no-print">
          <PageHeader
            title={`訂單 ${order.Order_ID}`}
            description={`表頭 1 筆 · 明細 ${details.length} 筆 · 金額以表頭為準`}
            actions={
              <PrintActions
                extra={
                  <Link href="/orders" className="btn-ghost text-sm">
                    返回訂單列表
                  </Link>
                }
              />
            }
          />
        </div>

        {error && (
          <div className="no-print">
            <Notice kind="error" title="無法更新狀態">
              {error}
            </Notice>
          </div>
        )}

        <div className="panel grid gap-2 px-4 py-3.5 text-sm sm:grid-cols-2">
          <p>
            <span className="text-[var(--muted)]">日期</span> {order.Order_Date}
          </p>
          <p>
            <span className="text-[var(--muted)]">客戶</span>{" "}
            <Link
              href={`/customers/${order.Customer_ID}/`}
              className="text-[var(--brand)] underline-offset-2 hover:underline"
            >
              {order.Customer_ID} {customerName(order.Customer_ID)}
            </Link>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--muted)]">狀態</span>
            <StatusBadge status={order.Order_Status} />
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
          <div className="no-print">
            <Notice kind="info">
              已出貨：庫存已依明細扣減；應收見上方連結。改回其他狀態會嘗試還原庫存並作廢未收款應收。
            </Notice>
          </div>
        )}

        {details.length === 0 ? (
          <Notice kind="empty">此訂單目前沒有明細列</Notice>
        ) : (
          <div className="table-shell table-dense">
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
                      <Link
                        href={`/products/${d.Product_ID}/`}
                        className="text-[var(--brand)] underline-offset-2 hover:underline"
                      >
                        {d.Product_ID} {productName(d.Product_ID)}
                      </Link>
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

        <div className="no-print grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="font-display mb-3 text-base text-[var(--brand-deep)]">
              相關紀錄
            </h2>
            <ul className="space-y-2 text-sm">
              {order.Quote_ID && (
                <li>
                  報價{" "}
                  <Link
                    href={`/quotations/${order.Quote_ID}/`}
                    className="text-[var(--brand)] underline-offset-2 hover:underline"
                  >
                    {order.Quote_ID}
                  </Link>
                </li>
              )}
              <li>
                出貨{" "}
                <Link
                  href="/shipping/"
                  className="text-[var(--brand)] underline-offset-2 hover:underline"
                >
                  揀貨清單
                </Link>
              </li>
              {ar && (
                <li>
                  應收{" "}
                  <Link
                    href="/receivables/"
                    className="text-[var(--brand)] underline-offset-2 hover:underline"
                  >
                    {ar.AR_ID}
                  </Link>
                </li>
              )}
            </ul>
          </section>
          <ActivityTimeline items={timeline} title="本單動態" />
        </div>

        <PrimaryActionBar
          status={
            <>
              目前狀態 <StatusBadge status={order.Order_Status} />
            </>
          }
        >
          {(order.Order_Status === "待確認" ||
            order.Order_Status === "處理中") && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => changeStatus("已出貨")}
            >
              確認出貨
            </button>
          )}
          {order.Order_Status === "待確認" && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => changeStatus("處理中")}
            >
              標為處理中
            </button>
          )}
          {ar && ar.Status !== "已結清" && (
            <Link href="/receivables/" className="btn-ghost">
              前往收款
            </Link>
          )}
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
          <button
            type="button"
            className="btn-ghost"
            onClick={() => window.print()}
          >
            列印訂單
          </button>
        </PrimaryActionBar>
      </div>
    </PrintSheet>
  );
}
