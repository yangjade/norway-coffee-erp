"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { Notice, PageHeader } from "@/components/Notice";
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

type Tab = "list" | "create" | "detail";

export default function ShippingPage() {
  const app = useApp();
  const {
    orders,
    orderDetails,
    products,
    stockReservations,
    shipments,
    shipmentDetails,
    deliveryLogs,
    customers,
    currentUser,
    hydrated,
    customerName,
    createShipmentFromOrder,
    saveShipmentDraft,
    postShipmentDoc,
    updateShipmentDelivery,
    inventorySnap,
  } = app;

  const [tab, setTab] = useState<Tab>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<ShipmentStatus | "">("");
  const [deliveryF, setDeliveryF] = useState<DeliveryStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [createOrderId, setCreateOrderId] = useState("");
  const [carrier, setCarrier] = useState("教學物流");
  const [tracking, setTracking] = useState("DEMO-0001");
  const [exceptionNote, setExceptionNote] = useState("");

  const filtered = useMemo(
    () =>
      filterShipments(shipments, orders, customers, {
        q,
        status: statusF,
        delivery: deliveryF,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }).sort((a, b) => b.Shipment_ID.localeCompare(a.Shipment_ID)),
    [shipments, orders, customers, q, statusF, deliveryF, dateFrom, dateTo],
  );

  const shipableOrders = useMemo(() => {
    return orders
      .filter((o) => o.Order_Status === "Confirmed")
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
  }, [orders, orderDetails, stockReservations, products]);

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
        .sort((a, b) => a.At.localeCompare(b.At))
    : [];

  function openDetail(id: string) {
    setSelectedId(id);
    setTab("detail");
    setFlash(null);
    setError(null);
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
    setFlash(result.message ?? "已建立草稿");
    openDetail(result.shipment.Shipment_ID);
  }

  function postDoc() {
    setFlash(null);
    setError(null);
    if (!selected) return;
    const result = postShipmentDoc(selected.Shipment_ID);
    if (!result.ok) {
      setError(result.message ?? "過帳失敗");
      return;
    }
    setFlash(result.message ?? "已過帳");
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
            : undefined,
      exceptionNote: to === "Exception" ? exceptionNote || "地址無人收件" : undefined,
    });
    if (!result.ok) {
      setError(result.message ?? "物流更新失敗");
      return;
    }
    setFlash(result.message ?? "已更新物流");
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="出貨與物流" description="第 11 週" />
        <Notice kind="info">正在載入本機資料…</Notice>
      </div>
    );
  }

  const isAdmin = currentUser.Role === "Admin";
  const snapP002 = inventorySnap("P002");
  const snapP011 = inventorySnap("P011");

  return (
    <div className="space-y-5 animate-rise" data-week11="shipping">
      <PageHeader
        title="出貨與物流"
        description="草稿不扣庫 · Admin 過帳現有↓保留↓ · 物流狀態另管（第 11 週）"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/orders/" className="btn-ghost text-sm">
              訂單
            </Link>
            <Link href="/inventory/" className="btn-ghost text-sm">
              庫存
            </Link>
            <Link href="/acceptance/#sh01" className="btn-ghost text-sm">
              T01–T12
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        僅 Confirmed＋有效保留可建草稿。Staff 可建草稿／更新物流；僅 Admin
        可過帳。物流 Exception／Delivered 不改庫存、不推定收款。本機 storage
        v8。
      </Notice>

      <div className="grid gap-2 sm:grid-cols-2 text-xs tabular-nums text-[var(--muted)]">
        <p>
          P002 現有／保留／可用：{snapP002?.On_Hand ?? "—"}／
          {snapP002?.Reserved ?? "—"}／{snapP002?.Available ?? "—"}
        </p>
        <p>
          P011 現有／保留／可用：{snapP011?.On_Hand ?? "—"}／
          {snapP011?.Reserved ?? "—"}／{snapP011?.Available ?? "—"}
        </p>
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

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {(
          [
            { id: "list" as const, label: `出貨列表（${shipments.length}）` },
            { id: "create" as const, label: "建立草稿" },
            { id: "detail" as const, label: "出貨詳情" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                : "text-[var(--muted)] hover:bg-[var(--linen)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <input
              className="input min-w-[10rem] flex-1"
              placeholder="出貨／訂單／客戶／追蹤號"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="input"
              value={statusF}
              onChange={(e) =>
                setStatusF(e.target.value as ShipmentStatus | "")
              }
            >
              <option value="">出貨狀態</option>
              <option value="Draft">Draft</option>
              <option value="Posted">Posted</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <select
              className="input"
              value={deliveryF}
              onChange={(e) =>
                setDeliveryF(e.target.value as DeliveryStatus | "")
              }
            >
              <option value="">物流狀態</option>
              <option value="Pending">Pending</option>
              <option value="InTransit">InTransit</option>
              <option value="Delivered">Delivered</option>
              <option value="Exception">Exception</option>
            </select>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <input
              type="date"
              className="input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <Notice kind="empty">
              尚無符合條件出貨單。可從「建立草稿」對 Confirmed＋已保留訂單建立。
            </Notice>
          ) : (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>出貨編號</th>
                    <th>來源訂單</th>
                    <th>客戶</th>
                    <th>離倉日</th>
                    <th>出貨狀態</th>
                    <th>物流狀態</th>
                    <th>追蹤號</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const order = orders.find((o) => o.Order_ID === s.Order_ID);
                    return (
                      <tr key={s.Shipment_ID}>
                        <td>
                          <button
                            type="button"
                            className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                            onClick={() => openDetail(s.Shipment_ID)}
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
                        <td>
                          {order
                            ? `${order.Customer_ID} ${customerName(order.Customer_ID)}`
                            : "—"}
                        </td>
                        <td>{s.Shipment_Date}</td>
                        <td>
                          {shipmentStatusLabelZh(s.Shipment_Status)} (
                          {s.Shipment_Status})
                        </td>
                        <td>
                          {deliveryStatusLabelZh(s.Delivery_Status)} (
                          {s.Delivery_Status})
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
      )}

      {tab === "create" && (
        <section className="space-y-3">
          <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
            從可出貨訂單建立草稿
          </h2>
          {shipableOrders.length === 0 ? (
            <Notice kind="empty">
              未確認／未配置／已出完 — 目前沒有可建立出貨的訂單。
            </Notice>
          ) : (
            <>
              <select
                className="input w-full max-w-xl"
                value={createOrderId}
                onChange={(e) => setCreateOrderId(e.target.value)}
              >
                <option value="">選擇訂單</option>
                {shipableOrders.map(({ order, preview }) => (
                  <option key={order.Order_ID} value={order.Order_ID}>
                    {order.Order_ID} · {customerName(order.Customer_ID)} ·{" "}
                    {preview.lines
                      .filter((l) => l.Remaining > 0)
                      .map((l) => `${l.Product_ID}×${l.Remaining}`)
                      .join("、")}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <input
                  className="input"
                  placeholder="承運人"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="追蹤號"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </div>
              <button type="button" className="btn-primary" onClick={createDraft}>
                建立出貨草稿（不扣庫）
              </button>
            </>
          )}
        </section>
      )}

      {tab === "detail" && (
        <section className="space-y-3">
          {!selected ? (
            <Notice kind="empty">請從列表選擇出貨單</Notice>
          ) : (
            <>
              <div className="panel grid gap-2 px-4 py-3.5 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-[var(--muted)]">出貨單</span>{" "}
                  <span className="font-mono font-semibold">
                    {selected.Shipment_ID}
                  </span>
                </p>
                <p>
                  <span className="text-[var(--muted)]">來源訂單</span>{" "}
                  <Link
                    href={`/orders/${selected.Order_ID}/`}
                    className="font-mono text-[var(--brand)]"
                  >
                    {selected.Order_ID}
                  </Link>
                  {" · 履約 "}
                  {computeFulfillment(selected.Order_ID, orderDetails)}
                </p>
                <p>
                  <span className="text-[var(--muted)]">出貨狀態</span>{" "}
                  {shipmentStatusLabelZh(selected.Shipment_Status)} (
                  {selected.Shipment_Status})
                </p>
                <p>
                  <span className="text-[var(--muted)]">物流狀態</span>{" "}
                  {deliveryStatusLabelZh(selected.Delivery_Status)} (
                  {selected.Delivery_Status})
                </p>
                <p>
                  <span className="text-[var(--muted)]">收貨</span>{" "}
                  {selected.Recipient}／{selected.Address_Snapshot}
                </p>
                <p>
                  <span className="text-[var(--muted)]">配送</span>{" "}
                  {selected.Delivery_Method} · {selected.Carrier ?? "—"} ·{" "}
                  {selected.Tracking_No ?? "—"}
                </p>
                {selected.Posted_At && (
                  <p className="sm:col-span-2 text-xs text-[var(--muted)]">
                    過帳 {selected.Posted_At} · by {selected.Posted_By}
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
                          <td className="font-mono text-xs">
                            {r.Reservation_ID}
                          </td>
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
                    {isAdmin ? (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={postDoc}
                      >
                        Admin 出貨過帳
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary opacity-60"
                        onClick={postDoc}
                      >
                        嘗試過帳（Staff 應拒）
                      </button>
                    )}
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
                      onClick={() => setDelivery("Exception")}
                    >
                      標記 Exception
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setDelivery("Delivered")}
                    >
                      更新 Delivered
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setDelivery("InTransit")}
                    >
                      轉回 InTransit
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
                <Link href="/inventory/moves/" className="btn-ghost">
                  庫存異動
                </Link>
                <Link href="/inventory/reservations/" className="btn-ghost">
                  保留紀錄
                </Link>
              </div>
              {selected.Shipment_Status === "Posted" && (
                <input
                  className="input w-full max-w-xl"
                  placeholder="異常原因（Exception）"
                  value={exceptionNote}
                  onChange={(e) => setExceptionNote(e.target.value)}
                />
              )}

              {selectedLogs.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-[var(--wood)]">
                    物流歷程
                  </h3>
                  <ul className="text-xs space-y-1 text-[var(--muted)]">
                    {selectedLogs.map((l) => (
                      <li key={l.Log_ID}>
                        {l.At} · {l.From_Status}→{l.To_Status} · {l.By_User_Name}
                        {l.Reason ? ` · ${l.Reason}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
