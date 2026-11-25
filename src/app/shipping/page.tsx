"use client";

import Link from "next/link";
import { Component, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { Notice } from "@/components/Notice";
import {
  computeFulfillment,
  deliveryStatusLabelZh,
  previewShipableOrder,
  shipmentStatusLabelZh,
} from "@/lib/shipment-rules";
import type { DeliveryStatus, Shipment } from "@/lib/types";

class ShippingErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return {
      error: err instanceof Error ? err.message : "出貨頁發生未預期錯誤",
    };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="space-y-4 animate-rise" data-week11="shipping-error">
          <h1 className="font-display text-2xl text-[var(--brand-deep)]">
            出貨與物流
          </h1>
          <Notice kind="error" title="出貨頁無法顯示">
            {this.state.error}。請按「載入第11週範例」重設本機資料。
          </Notice>
        </div>
      );
    }
    return this.props.children;
  }
}

function ShippingPageInner() {
  const app = useApp();
  const {
    orders: ordersRaw,
    orderDetails: detailsRaw,
    products: productsRaw,
    stockReservations: reservesRaw,
    shipments: shipmentsRaw,
    shipmentDetails: shipDetailsRaw,
    deliveryLogs: logsRaw,
    currentUser,
    hydrated,
    customerName,
    createShipmentFromOrder,
    saveShipmentDraft,
    postShipmentDoc,
    updateShipmentDelivery,
    inventorySnap,
    resetDemoData,
  } = app;

  const orders = ordersRaw ?? [];
  const orderDetails = detailsRaw ?? [];
  const products = productsRaw ?? [];
  const stockReservations = reservesRaw ?? [];
  const shipments = Array.isArray(shipmentsRaw)
    ? shipmentsRaw.filter((s) => s && typeof s.Shipment_ID === "string")
    : [];
  const shipmentDetails = Array.isArray(shipDetailsRaw) ? shipDetailsRaw : [];
  const deliveryLogs = Array.isArray(logsRaw) ? logsRaw : [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exceptionNote, setExceptionNote] = useState("");

  const sorted = useMemo(
    () =>
      [...shipments].sort((a, b) =>
        String(b.Shipment_ID ?? "").localeCompare(String(a.Shipment_ID ?? "")),
      ),
    [shipments],
  );

  const shipableOrders = useMemo(() => {
    try {
      return orders
        .filter((o) => o?.Order_Status === "Confirmed")
        .map((o) => ({
          order: o,
          preview: previewShipableOrder(
            o,
            orderDetails,
            stockReservations,
            products,
          ),
        }))
        .filter((x) => x.preview.ok);
    } catch {
      return [];
    }
  }, [orders, orderDetails, stockReservations, products]);

  const kpi = useMemo(
    () => ({
      draft: shipments.filter((s) => s.Shipment_Status === "Draft").length,
      transit: shipments.filter(
        (s) =>
          s.Shipment_Status === "Posted" && s.Delivery_Status === "InTransit",
      ).length,
      delivered: shipments.filter((s) => s.Delivery_Status === "Delivered")
        .length,
      exception: shipments.filter((s) => s.Delivery_Status === "Exception")
        .length,
    }),
    [shipments],
  );

  const selected: Shipment | undefined = selectedId
    ? shipments.find((s) => s.Shipment_ID === selectedId)
    : undefined;
  const selectedRows = selected
    ? shipmentDetails
        .filter((d) => d.Shipment_ID === selected.Shipment_ID)
        .sort((a, b) => a.Line_No - b.Line_No)
    : [];
  const selectedLogs = selected
    ? deliveryLogs
        .filter((l) => l.Shipment_ID === selected.Shipment_ID)
        .sort((a, b) => String(a.At).localeCompare(String(b.At)))
    : [];

  function loadWeek11() {
    resetDemoData();
    setFlash("已載入第11週範例（草稿／運送中／已送達／異常＋可建草稿訂單）");
    setError(null);
    setSelectedId("SH-20261125-001");
  }

  function createDraft(orderId: string) {
    setFlash(null);
    setError(null);
    const result = createShipmentFromOrder({
      orderId,
      shipmentDate: "2026-11-25",
      deliveryMethod: "宅配",
      carrier: "教學物流",
      trackingNo: `DEMO-${Date.now().toString().slice(-4)}`,
    });
    if (!result.ok || !result.shipment) {
      setError(result.message ?? "建立失敗");
      return;
    }
    setFlash(result.message ?? "已建立草稿（未扣庫）");
    setSelectedId(result.shipment.Shipment_ID);
  }

  function postDoc() {
    if (!selected) return;
    setFlash(null);
    setError(null);
    const result = postShipmentDoc(selected.Shipment_ID);
    if (!result.ok) {
      setError(result.message ?? "過帳失敗");
      return;
    }
    setFlash(result.message ?? "已過帳：現有↓保留↓");
    setSelectedId(result.shipment?.Shipment_ID ?? selected.Shipment_ID);
  }

  function cancelDraft() {
    if (!selected) return;
    const result = saveShipmentDraft({
      shipmentId: selected.Shipment_ID,
      cancel: true,
    });
    if (!result.ok) {
      setError(result.message ?? "作廢失敗");
      return;
    }
    setFlash(result.message ?? "已作廢");
  }

  function setDelivery(to: DeliveryStatus) {
    if (!selected) return;
    setFlash(null);
    setError(null);
    const result = updateShipmentDelivery({
      shipmentId: selected.Shipment_ID,
      toStatus: to,
      reason:
        to === "Exception"
          ? exceptionNote || "地址無人收件"
          : to === "Delivered"
            ? "物流確認交付"
            : "更新運送中",
      exceptionNote:
        to === "Exception" ? exceptionNote || "地址無人收件" : undefined,
    });
    if (!result.ok) {
      setError(result.message ?? "物流更新失敗");
      return;
    }
    setFlash(result.message ?? "已更新物流");
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise" data-week11="shipping-loading">
        <p className="text-sm text-[var(--muted)]">正在載入本機資料…</p>
      </div>
    );
  }

  const isAdmin = currentUser?.Role === "Admin";
  const snapP002 = inventorySnap("P002");
  const snapP011 = inventorySnap("P011");

  return (
    <div className="space-y-6 animate-rise" data-week11="shipping">
      {/* Hero — Norway Coffee soft nordic, not tea-green clone */}
      <header className="relative overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 0% 0%, rgba(217,226,232,0.55), transparent 55%), radial-gradient(ellipse 50% 60% at 100% 20%, rgba(201,184,163,0.35), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow mb-2">挪威的咖啡 · 第 11 週</p>
            <h1 className="font-display text-[1.85rem] tracking-[0.04em] text-[var(--brand-deep)] sm:text-[2.2rem]">
              出貨與物流
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
              草稿不扣庫 · Admin 過帳現有與保留同減 · 物流狀態另管
            </p>
          </div>
          <button
            type="button"
            className="btn-primary shrink-0 px-5 py-2.5"
            data-week11="load-examples"
            onClick={loadWeek11}
          >
            載入第11週範例
          </button>
        </div>
      </header>

      {/* Compact pulse — not a tea-style KPI card strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-[var(--muted)]">此刻</span>
        <span>
          草稿{" "}
          <strong className="tabular-nums text-[var(--brand-deep)]">
            {kpi.draft}
          </strong>
        </span>
        <span className="text-[var(--border)]">·</span>
        <span>
          運送中{" "}
          <strong className="tabular-nums text-[var(--brand-deep)]">
            {kpi.transit}
          </strong>
        </span>
        <span className="text-[var(--border)]">·</span>
        <span>
          已送達{" "}
          <strong className="tabular-nums text-[var(--brand-deep)]">
            {kpi.delivered}
          </strong>
        </span>
        <span className="text-[var(--border)]">·</span>
        <span>
          異常{" "}
          <strong className="tabular-nums text-[var(--brand-deep)]">
            {kpi.exception}
          </strong>
        </span>
        <span className="ml-auto text-xs tabular-nums text-[var(--muted)]">
          P002 {snapP002?.On_Hand ?? "—"}/{snapP002?.Reserved ?? "—"} · P011{" "}
          {snapP011?.On_Hand ?? "—"}/{snapP011?.Reserved ?? "—"}
        </span>
      </div>

      {flash && (
        <div className="animate-success-flash">
          <Notice kind="info">{flash}</Notice>
        </div>
      )}
      {error && (
        <Notice kind="error" title="無法完成">
          {error}
        </Notice>
      )}

      {/* List */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
            出貨列表
          </h2>
          <p className="text-xs text-[var(--muted)]">
            點一筆看詳情 · 過帳與物流
          </p>
        </div>
        {sorted.length === 0 ? (
          <Notice kind="empty" title="尚無出貨單">
            按上方「載入第11週範例」，或從下方可出貨訂單建立草稿。
          </Notice>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>出貨單</th>
                  <th>訂單</th>
                  <th>客戶</th>
                  <th>出貨</th>
                  <th>物流</th>
                  <th>追蹤號</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const order = orders.find((o) => o.Order_ID === s.Order_ID);
                  const active = selectedId === s.Shipment_ID;
                  return (
                    <tr
                      key={s.Shipment_ID}
                      className={
                        active ? "bg-[var(--brand-soft)]/40" : undefined
                      }
                    >
                      <td>
                        <button
                          type="button"
                          className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                          onClick={() => {
                            setSelectedId(s.Shipment_ID);
                            setFlash(null);
                            setError(null);
                          }}
                        >
                          {s.Shipment_ID}
                        </button>
                      </td>
                      <td className="font-mono text-xs">{s.Order_ID}</td>
                      <td className="text-sm">
                        {order
                          ? customerName(order.Customer_ID)
                          : "—"}
                      </td>
                      <td className="text-sm">
                        {shipmentStatusLabelZh(s.Shipment_Status)}
                      </td>
                      <td className="text-sm">
                        {deliveryStatusLabelZh(s.Delivery_Status)}
                      </td>
                      <td className="font-mono text-xs">
                        {s.Tracking_No ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Detail / actions */}
      {selected && (
        <section className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--paper)]/80 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
                {selected.Shipment_ID}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {shipmentStatusLabelZh(selected.Shipment_Status)} ·{" "}
                {deliveryStatusLabelZh(selected.Delivery_Status)} · 訂單{" "}
                <Link
                  href={`/orders/${selected.Order_ID}/`}
                  className="font-mono text-[var(--brand)]"
                >
                  {selected.Order_ID}
                </Link>{" "}
                · 履約 {computeFulfillment(selected.Order_ID, orderDetails)}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setSelectedId(null)}
            >
              收合
            </button>
          </div>

          <p className="text-sm text-[var(--muted)]">
            {selected.Recipient} · {selected.Address_Snapshot} ·{" "}
            {selected.Carrier ?? "—"} / {selected.Tracking_No ?? "—"}
          </p>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>列</th>
                  <th>商品</th>
                  <th>量</th>
                  <th>保留</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((r) => (
                  <tr key={`${r.Shipment_ID}-${r.Line_No}`}>
                    <td>{r.Line_No}</td>
                    <td>
                      {r.Product_ID} {r.Product_Name_Snapshot}
                    </td>
                    <td className="tabular-nums">{r.Ship_Qty}</td>
                    <td className="font-mono text-xs">{r.Reservation_ID}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            {selected.Shipment_Status === "Draft" && (
              <>
                <button type="button" className="btn-primary" onClick={postDoc}>
                  {isAdmin ? "Admin 出貨過帳" : "嘗試過帳（Staff 應拒）"}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={cancelDraft}
                >
                  作廢草稿
                </button>
              </>
            )}
            {selected.Shipment_Status === "Posted" && (
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDelivery("InTransit")}
                >
                  運送中
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setDelivery("Delivered")}
                >
                  已送達
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setDelivery("Exception")}
                >
                  異常
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={postDoc}
                  >
                    重按過帳（冪等）
                  </button>
                )}
              </>
            )}
          </div>
          {selected.Shipment_Status === "Posted" && (
            <input
              className="field w-full max-w-md"
              placeholder="異常原因（選填）"
              value={exceptionNote}
              onChange={(e) => setExceptionNote(e.target.value)}
            />
          )}
          {selectedLogs.length > 0 && (
            <ul className="space-y-1 text-xs text-[var(--muted)]">
              {selectedLogs.map((l) => (
                <li key={l.Log_ID}>
                  {deliveryStatusLabelZh(l.From_Status)}→
                  {deliveryStatusLabelZh(l.To_Status)}
                  {l.Reason ? ` · ${l.Reason}` : ""} · {l.By_User_Name}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Shippable sources — simple list, one action */}
      <section className="space-y-3">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          可建草稿的訂單
        </h2>
        {shipableOrders.length === 0 ? (
          <Notice kind="empty" title="沒有可出貨訂單">
            需 Confirmed＋有效保留。請「載入第11週範例」。
          </Notice>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
            {shipableOrders.map(({ order, preview }) => (
              <li
                key={order.Order_ID}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-[var(--brand-deep)]">
                    {order.Order_ID}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {customerName(order.Customer_ID)} ·{" "}
                    {preview.lines
                      .filter((l) => l.Remaining > 0)
                      .map((l) => `${l.Product_ID}×${l.Remaining}`)
                      .join("、")}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={() => createDraft(order.Order_ID)}
                >
                  建立草稿
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-[var(--muted)]">
        <Link href="/orders/" className="text-[var(--brand)] hover:underline">
          訂單
        </Link>
        {" · "}
        <Link
          href="/inventory/"
          className="text-[var(--brand)] hover:underline"
        >
          庫存
        </Link>
        {" · "}
        <Link
          href="/acceptance/#sh01"
          className="text-[var(--brand)] hover:underline"
        >
          T01–T12
        </Link>
      </p>
    </div>
  );
}

export default function ShippingPage() {
  return (
    <ShippingErrorBoundary>
      <ShippingPageInner />
    </ShippingErrorBoundary>
  );
}
