"use client";

import Link from "next/link";
import { Component, useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { Notice } from "@/components/Notice";
import {
  computeFulfillment,
  deliveryStatusLabelZh,
  filterShipments,
  previewShipableOrder,
  shipmentStatusLabelZh,
} from "@/lib/shipment-rules";
import type {
  DeliveryStatus,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";

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
    customers: customersRaw,
    currentUser,
    hydrated,
    customerName,
    createShipmentFromOrder,
    saveShipmentDraft,
    postShipmentDoc,
    updateShipmentDelivery,
    inventorySnap,
    resetDemoData,
    prepareWeek11Lab,
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
  const customers = customersRaw ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<ShipmentStatus | "">("");
  const [deliveryF, setDeliveryF] = useState<DeliveryStatus | "">("");
  const [customerId, setCustomerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createOrderId, setCreateOrderId] = useState("");
  const [carrier, setCarrier] = useState("教學物流");
  const [tracking, setTracking] = useState("DEMO-0001");
  const [exceptionNote, setExceptionNote] = useState("");

  const filtered = useMemo(() => {
    try {
      return filterShipments(shipments, orders, customers, {
        q,
        status: statusF,
        delivery: deliveryF,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        customerId: customerId || undefined,
      }).sort((a, b) =>
        String(b.Shipment_ID ?? "").localeCompare(String(a.Shipment_ID ?? "")),
      );
    } catch {
      return [];
    }
  }, [
    shipments,
    orders,
    customers,
    q,
    statusF,
    deliveryF,
    dateFrom,
    dateTo,
    customerId,
  ]);

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

  function loadExamples() {
    resetDemoData();
    setFlash("已載入第11週範例：可建草稿＋Draft＋運送中＋已送達＋異常");
    setError(null);
    setSelectedId("SH-20261125-001");
    setQ("");
    setStatusF("");
    setDeliveryF("");
    setCustomerId("");
  }

  function createDraft() {
    setFlash(null);
    setError(null);
    if (!createOrderId) {
      setError("請選擇來源訂單。");
      return;
    }
    const result = createShipmentFromOrder({
      orderId: createOrderId,
      shipmentDate: "2026-11-25",
      deliveryMethod: "宅配",
      carrier,
      trackingNo: tracking,
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

  const customerOptions = useMemo(() => {
    const ids = new Set(
      shipments
        .map((s) => orders.find((o) => o.Order_ID === s.Order_ID)?.Customer_ID)
        .filter(Boolean) as string[],
    );
    return customers.filter((c) => ids.has(c.Customer_ID));
  }, [shipments, orders, customers]);

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
      {/* Header */}
      <header className="relative overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-5 py-6 sm:px-7">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 65% 80% at 0% 0%, rgba(217,226,232,0.5), transparent 55%), radial-gradient(ellipse 45% 55% at 100% 10%, rgba(201,184,163,0.28), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-2">挪威的咖啡 · 第 11 週</p>
            <h1 className="font-display text-[1.85rem] tracking-[0.04em] text-[var(--brand-deep)] sm:text-[2.15rem]">
              出貨與物流
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
              草稿不扣庫 · Admin 過帳現有與保留同減 · 物流
              Pending／運送中／已送達／異常另管
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary px-5 py-2.5"
              data-week11="load-examples"
              onClick={loadExamples}
            >
              載入第11週範例
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const r = prepareWeek11Lab();
                setFlash(r.message ?? "SO-B 驗收起點就緒");
                setError(null);
                setSelectedId(null);
                if (r.orderId) setCreateOrderId(r.orderId);
              }}
            >
              準備 SO-B 起點
            </button>
            <Link href="/acceptance/#sh01" className="btn-ghost">
              T01–T12
            </Link>
          </div>
        </div>
      </header>

      {/* Status pulse + inventory link */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[var(--paper)]/70 px-4 py-3 text-sm">
        <span className="text-[var(--muted)]">狀態</span>
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
        <span className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums text-[var(--muted)]">
          <span title="現有／保留／可用">
            P002 {snapP002?.On_Hand ?? "—"}／{snapP002?.Reserved ?? "—"}／
            {snapP002?.Available ?? "—"}
          </span>
          <span>
            P011 {snapP011?.On_Hand ?? "—"}／{snapP011?.Reserved ?? "—"}／
            {snapP011?.Available ?? "—"}
          </span>
          <Link
            href="/inventory/"
            className="text-[var(--brand)] hover:underline"
          >
            庫存
          </Link>
          <Link
            href="/inventory/reservations/"
            className="text-[var(--brand)] hover:underline"
          >
            保留
          </Link>
          <Link
            href="/inventory/moves/"
            className="text-[var(--brand)] hover:underline"
          >
            異動
          </Link>
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

      {/* Query */}
      <section className="space-y-3">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          出貨查詢
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="field min-w-[12rem] flex-1"
            placeholder="出貨／訂單／客戶／追蹤號"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="field"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">全部客戶</option>
            {customerOptions.map((c) => (
              <option key={c.Customer_ID} value={c.Customer_ID}>
                {c.Customer_ID} {c.Customer_Name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={statusF}
            onChange={(e) => setStatusF(e.target.value as ShipmentStatus | "")}
          >
            <option value="">出貨狀態</option>
            <option value="Draft">草稿</option>
            <option value="Posted">已過帳</option>
            <option value="Cancelled">已作廢</option>
          </select>
          <select
            className="field"
            value={deliveryF}
            onChange={(e) =>
              setDeliveryF(e.target.value as DeliveryStatus | "")
            }
          >
            <option value="">物流狀態</option>
            <option value="Pending">待交付</option>
            <option value="InTransit">運送中</option>
            <option value="Delivered">已送達</option>
            <option value="Exception">異常</option>
          </select>
          <input
            type="date"
            className="field"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="離倉起日"
          />
          <input
            type="date"
            className="field"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="離倉迄日"
          />
        </div>
      </section>

      {/* List */}
      <section className="space-y-3">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          出貨列表（{filtered.length}）
        </h2>
        {filtered.length === 0 ? (
          <Notice kind="empty" title="沒有符合條件的出貨單">
            請「載入第11週範例」，或從下方可出貨訂單建立草稿，或調整查詢。
          </Notice>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>出貨單</th>
                  <th>訂單</th>
                  <th>客戶</th>
                  <th>離倉日</th>
                  <th>出貨狀態</th>
                  <th>物流</th>
                  <th>追蹤號</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const order = orders.find((o) => o.Order_ID === s.Order_ID);
                  const active = selectedId === s.Shipment_ID;
                  return (
                    <tr
                      key={s.Shipment_ID}
                      className={
                        active ? "bg-[var(--brand-soft)]/35" : undefined
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
                      <td>
                        <Link
                          href={`/orders/${s.Order_ID}/`}
                          className="font-mono text-xs text-[var(--brand)]"
                        >
                          {s.Order_ID}
                        </Link>
                      </td>
                      <td className="text-sm">
                        {order
                          ? `${order.Customer_ID} ${customerName(order.Customer_ID)}`
                          : "—"}
                      </td>
                      <td className="tabular-nums text-sm">{s.Shipment_Date}</td>
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

      {/* Detail panel */}
      {selected && (
        <section className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--paper)]/85 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
                出貨詳情 · {selected.Shipment_ID}
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

          <div className="grid gap-1 text-sm text-[var(--muted)] sm:grid-cols-2">
            <p>
              收貨 {selected.Recipient}／{selected.Address_Snapshot}
            </p>
            <p>
              {selected.Delivery_Method} · {selected.Carrier ?? "—"} ·{" "}
              {selected.Tracking_No ?? "—"}
            </p>
            {selected.Posted_At && (
              <p className="sm:col-span-2 text-xs">
                過帳 {selected.Posted_At} · {selected.Posted_By}
              </p>
            )}
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>列</th>
                  <th>商品快照</th>
                  <th>出貨量</th>
                  <th>保留</th>
                  <th>訂單列</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((r) => {
                  const od = orderDetails.find(
                    (d) => d.Detail_ID === r.Order_Line,
                  );
                  return (
                    <tr key={`${r.Shipment_ID}-${r.Line_No}`}>
                      <td>{r.Line_No}</td>
                      <td>
                        {r.Product_ID} {r.Product_Name_Snapshot}（
                        {r.Unit_Snapshot}）
                      </td>
                      <td className="tabular-nums">{r.Ship_Qty}</td>
                      <td className="font-mono text-xs">{r.Reservation_ID}</td>
                      <td className="text-xs">
                        訂 {od?.Qty ?? "—"}／已出 {od?.Shipped_Qty ?? 0}
                      </td>
                    </tr>
                  );
                })}
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
            <Link href="/inventory/moves/" className="btn-ghost text-sm">
              看庫存異動
            </Link>
          </div>
          {selected.Shipment_Status === "Posted" && (
            <input
              className="field w-full max-w-md"
              placeholder="異常原因（標記異常時使用）"
              value={exceptionNote}
              onChange={(e) => setExceptionNote(e.target.value)}
            />
          )}
          {selectedLogs.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-[var(--wood)]">
                物流歷程
              </h3>
              <ul className="space-y-1 text-xs text-[var(--muted)]">
                {selectedLogs.map((l) => (
                  <li key={l.Log_ID}>
                    {deliveryStatusLabelZh(l.From_Status)}→
                    {deliveryStatusLabelZh(l.To_Status)}
                    {l.Reason ? ` · ${l.Reason}` : ""} · {l.By_User_Name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Shippable orders + create draft */}
      <section className="space-y-3">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          來源訂單與可出貨檢查
        </h2>
        <p className="text-xs text-[var(--muted)]">
          僅 Confirmed＋有效保留可建草稿。建草稿不扣庫；過帳才現有↓保留↓。
        </p>
        {shipableOrders.length === 0 ? (
          <Notice kind="empty" title="沒有可出貨訂單">
            請「載入第11週範例」或完成第 10 週確認＋保留。
          </Notice>
        ) : (
          <>
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>訂單</th>
                    <th>客戶</th>
                    <th>可出貨明細</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {shipableOrders.map(({ order, preview }) => (
                    <tr key={order.Order_ID}>
                      <td className="font-mono text-xs">{order.Order_ID}</td>
                      <td className="text-sm">
                        {customerName(order.Customer_ID)}
                      </td>
                      <td className="text-xs text-[var(--muted)]">
                        {preview.lines
                          .filter((l) => l.Remaining > 0)
                          .map(
                            (l) =>
                              `${l.Product_ID}×${l.Remaining}（保留 ${l.Reserve_Qty}）`,
                          )
                          .join("；")}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => setCreateOrderId(order.Order_ID)}
                        >
                          選取
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-end gap-2 rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-3">
              <label className="text-xs text-[var(--muted)]">
                來源訂單
                <select
                  className="field mt-1 min-w-[14rem]"
                  value={createOrderId}
                  onChange={(e) => setCreateOrderId(e.target.value)}
                >
                  <option value="">選擇訂單</option>
                  {shipableOrders.map(({ order, preview }) => (
                    <option key={order.Order_ID} value={order.Order_ID}>
                      {order.Order_ID} ·{" "}
                      {preview.lines
                        .filter((l) => l.Remaining > 0)
                        .map((l) => `${l.Product_ID}×${l.Remaining}`)
                        .join("、")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[var(--muted)]">
                承運人
                <input
                  className="field mt-1"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </label>
              <label className="text-xs text-[var(--muted)]">
                追蹤號
                <input
                  className="field mt-1"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </label>
              <button type="button" className="btn-primary" onClick={createDraft}>
                建立出貨草稿
              </button>
            </div>
          </>
        )}
      </section>

      <p className="text-xs text-[var(--muted)]">
        <Link href="/orders/" className="text-[var(--brand)] hover:underline">
          銷售訂單
        </Link>
        {" · "}
        <Link
          href="/inventory/"
          className="text-[var(--brand)] hover:underline"
        >
          庫存總覽
        </Link>
        {" · "}
        <Link href="/settings/" className="text-[var(--brand)] hover:underline">
          設定／重設樣本
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
