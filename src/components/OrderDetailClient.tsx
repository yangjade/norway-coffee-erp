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
import {
  isLateDelivery,
  ORDER_STATUS_RULES_ZH,
  statusLabelZh,
} from "@/lib/order-rules";

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
    orderAudits,
    currentUser,
    saveDraftOrder,
    confirmSalesOrder,
    cancelSalesOrder,
    reopenSalesOrder,
    customerName,
  } = useApp();
  const { pushToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});

  const order = orders.find((o) => o.Order_ID === orderId);
  const details = orderDetails.filter((d) => d.Order_ID === orderId);
  const ar = receivables.find(
    (r) => r.Order_ID === orderId && r.Status !== "已作廢",
  );
  const audits = orderAudits.filter((a) => a.Order_ID === orderId);

  const timeline = useMemo(() => {
    if (!order) return [];
    return buildActivityFeed({
      orders: [order],
      quotations: order.Quote_ID
        ? quotations.filter((q) => q.Quote_ID === order.Quote_ID)
        : [],
      receivables: receivables.filter((r) => r.Order_ID === orderId),
      payments: payments.filter((p) =>
        receivables.some(
          (r) => r.Order_ID === orderId && r.AR_ID === p.AR_ID,
        ),
      ),
      stockMoves: stockMoves.filter((m) => m.Ref_Order_ID === orderId),
      customerName,
      limit: 8,
    });
  }, [
    order,
    orderId,
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
          <Link href="/orders/" className="text-[var(--brand)] underline">
            返回訂單列表
          </Link>
        </Notice>
      </div>
    );
  }

  const late = isLateDelivery(order);
  const isDraft = order.Order_Status === "Draft";
  const isConfirmed = order.Order_Status === "Confirmed";
  const isCancelled = order.Order_Status === "Cancelled";

  function toastResult(ok: boolean, message?: string, title?: string) {
    if (!ok) {
      setError(message ?? "失敗");
      pushToast({ tone: "error", title: title ?? "失敗", message: message ?? "" });
      return;
    }
    setError(null);
    pushToast({ tone: "success", message: message ?? "完成" });
  }

  function saveDraft() {
    if (!order) return;
    const qtyByDetailId: Record<string, number> = {};
    for (const d of details) {
      const raw = qtyDraft[d.Detail_ID];
      if (raw != null && raw !== "") {
        qtyByDetailId[d.Detail_ID] = Number(raw);
      }
    }
    const result = saveDraftOrder(order.Order_ID, {
      requestedDate: order.Requested_Date,
      promisedDate: order.Promised_Date,
      deliveryAgreed: order.Delivery_Agreed,
      deliveryAgreeNote: order.Delivery_Agree_Note,
      shipToName: order.Ship_To_Name,
      shipToAddress: order.Ship_To_Address,
      paymentTerms: order.Payment_Terms_Snapshot,
      notes: order.Notes,
      qtyByDetailId:
        Object.keys(qtyByDetailId).length > 0 ? qtyByDetailId : undefined,
    });
    toastResult(result.ok, result.message, "無法儲存");
  }

  return (
    <PrintSheet
      docTitle="銷售訂單"
      docId={order.Order_ID}
      meta={
        <>
          {order.Order_Date} · 期望 {order.Requested_Date} · 承諾{" "}
          {order.Promised_Date}
        </>
      }
    >
      <div
        className="space-y-5 animate-rise"
        data-week8="order-detail"
        data-week8-marker="week8-official-20261118"
      >
        <div className="no-print">
          <PageHeader
            title={`訂單 ${order.Order_ID}`}
            description={`第 8 週 · ${statusLabelZh(order.Order_Status)} · 確認不扣庫`}
            actions={
              <PrintActions
                extra={
                  <Link href="/orders/" className="btn-ghost text-sm">
                    返回列表
                  </Link>
                }
              />
            }
          />
        </div>

        {error && (
          <div className="no-print">
            <Notice kind="error">{error}</Notice>
          </div>
        )}

        {late && (
          <div className="no-print">
            <Notice kind="error" title="晚交提示">
              承諾日 {order.Promised_Date} 晚於期望日 {order.Requested_Date}。
              {order.Delivery_Agreed
                ? "已記錄改期同意。"
                : "尚未改期同意，不可確認。"}
            </Notice>
          </div>
        )}

        <div className="panel grid gap-2 px-4 py-3.5 text-sm sm:grid-cols-2">
          <p>
            <span className="text-[var(--muted)]">訂單日</span> {order.Order_Date}
          </p>
          <p>
            <span className="text-[var(--muted)]">狀態</span>{" "}
            <StatusBadge status={order.Order_Status} />
          </p>
          <p>
            <span className="text-[var(--muted)]">期望交貨日</span>{" "}
            {isDraft ? (
              <input
                type="date"
                className="field text-xs"
                value={order.Requested_Date}
                onChange={(e) =>
                  saveDraftOrder(order.Order_ID, {
                    requestedDate: e.target.value,
                  })
                }
              />
            ) : (
              order.Requested_Date
            )}
          </p>
          <p>
            <span className="text-[var(--muted)]">承諾交貨日</span>{" "}
            {isDraft ? (
              <input
                type="date"
                className="field text-xs"
                value={order.Promised_Date}
                onChange={(e) =>
                  saveDraftOrder(order.Order_ID, {
                    promisedDate: e.target.value,
                  })
                }
              />
            ) : (
              <span data-field="Promised_Date">{order.Promised_Date}</span>
            )}
          </p>
          <p>
            <span className="text-[var(--muted)]">客戶</span> {order.Customer_ID}{" "}
            {customerName(order.Customer_ID)}
          </p>
          <p>
            <span className="text-[var(--muted)]">來源報價</span>{" "}
            {order.Quote_ID ? (
              <Link
                href={`/quotations/${order.Quote_ID}/`}
                className="font-mono text-xs text-[var(--brand)] underline"
              >
                {order.Quote_ID}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p>
            <span className="text-[var(--muted)]">收貨地址</span>{" "}
            {order.Ship_To_Address || "—"}
          </p>
          <p>
            <span className="text-[var(--muted)]">付款條件</span>{" "}
            {order.Payment_Terms_Snapshot || "—"}
          </p>
          <p>
            <span className="text-[var(--muted)]">未稅小計</span> NT${" "}
            {formatTwd(order.Subtotal)}
          </p>
          <p>
            <span className="text-[var(--muted)]">稅額 5%</span> NT${" "}
            {formatTwd(order.Tax_Amount)}
          </p>
          <p className="sm:col-span-2">
            <span className="text-[var(--muted)]">含稅總額</span>{" "}
            <span className="font-semibold tabular-nums" data-field="Total_Amount">
              NT$ {formatTwd(order.Total_Amount)}
            </span>
          </p>
        </div>

        {isDraft && (
          <Notice kind="info">
            按「確認」＝把貨留下來給這張單（保留↑、可用↓），貨還在倉庫所以現有不變。
            若有任何一項不夠：整張維持草稿，並用白話告訴你缺哪幾項（不會半保留）。
          </Notice>
        )}

        {isDraft && (
          <div className="no-print panel flex flex-wrap items-center gap-3 px-4 py-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={order.Delivery_Agreed}
                onChange={(e) =>
                  saveDraftOrder(order.Order_ID, {
                    deliveryAgreed: e.target.checked,
                    deliveryAgreeNote: e.target.checked
                      ? "客戶同意改期"
                      : "",
                  })
                }
              />
              改期同意 delivery_agreed
            </label>
          </div>
        )}

        <div className="table-shell table-dense">
          <table>
            <thead>
              <tr>
                <th>商品快照</th>
                <th>單位</th>
                <th>數量</th>
                <th>單價</th>
                <th>折扣%</th>
                <th>折後未稅</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.Detail_ID}>
                  <td>
                    {d.Product_ID} {d.Product_Name_Snapshot}
                  </td>
                  <td>{d.Unit_Snapshot}</td>
                  <td>
                    {isDraft ? (
                      <input
                        className="field w-20 text-xs"
                        type="number"
                        value={qtyDraft[d.Detail_ID] ?? String(d.Qty)}
                        onChange={(e) =>
                          setQtyDraft((prev) => ({
                            ...prev,
                            [d.Detail_ID]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      d.Qty
                    )}
                  </td>
                  <td className="tabular-nums">{formatTwd(d.Unit_Price)}</td>
                  <td className="tabular-nums">{d.Discount_Rate}</td>
                  <td className="tabular-nums">{formatTwd(d.Line_Amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {audits.length > 0 && (
          <div className="panel px-4 py-3 text-xs">
            <p className="font-medium text-[var(--brand-deep)]">異動紀錄</p>
            <ul className="mt-2 space-y-1 text-[var(--muted)]">
              {audits.map((a) => (
                <li key={a.Audit_ID}>
                  {a.At.slice(0, 19)} · {a.User_Name} · {a.Action}
                  {a.Reason ? ` · ${a.Reason}` : ""} · {a.Before}→{a.After}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="no-print panel px-4 py-3 text-xs text-[var(--muted)]">
          <ul className="list-disc pl-4">
            {ORDER_STATUS_RULES_ZH.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="no-print grid gap-8 lg:grid-cols-2">
          <ActivityTimeline items={timeline} title="本單動態" />
          {ar && (
            <p className="text-sm">
              應收（出貨後）{" "}
              <Link href="/receivables/" className="text-[var(--brand)] underline">
                {ar.AR_ID}
              </Link>
            </p>
          )}
        </div>

        <PrimaryActionBar
          status={
            <>
              目前 <StatusBadge status={order.Order_Status} /> ·{" "}
              {currentUser.Role}
            </>
          }
        >
          {isDraft && (
            <>
              <button type="button" className="btn-ghost" onClick={saveDraft}>
                儲存草稿
              </button>
              <button
                type="button"
                className="btn-primary"
                title="確認後會保留庫存，不會扣現有量"
                onClick={() => {
                  const r = confirmSalesOrder(order.Order_ID);
                  toastResult(r.ok, r.message, "無法確認（整單未保留）");
                }}
              >
                確認訂單（會保留、不扣現有）
              </button>
              <input
                className="field text-xs"
                placeholder="取消原因"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  const r = cancelSalesOrder(order.Order_ID, reason);
                  toastResult(r.ok, r.message, "無法取消");
                }}
              >
                取消草稿
              </button>
            </>
          )}
          {isConfirmed && (
            <>
              <input
                className="field text-xs"
                placeholder="重開／取消原因（Admin）"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  const r = reopenSalesOrder(order.Order_ID, reason);
                  toastResult(r.ok, r.message, "無法重開");
                }}
              >
                Admin 重開
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  const r = cancelSalesOrder(order.Order_ID, reason);
                  toastResult(r.ok, r.message, "無法取消");
                }}
              >
                Admin 取消
              </button>
              <Link href="/shipping/" className="btn-primary">
                出貨（第 11 週）
              </Link>
            </>
          )}
          {isCancelled && (
            <span className="text-xs text-[var(--muted)]">
              已取消終態，不可再確認或刪除
            </span>
          )}
        </PrimaryActionBar>
      </div>
    </PrintSheet>
  );
}
