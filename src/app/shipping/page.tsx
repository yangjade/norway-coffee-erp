"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { previewShipStock } from "@/lib/inventory-rules";
import { formatTwd } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Notice, PageHeader } from "@/components/Notice";
import type { SalesOrder } from "@/lib/types";

type Tab = "pick" | "shipped";

export default function ShippingPage() {
  const {
    orders,
    orderDetails,
    products,
    receivables,
    setOrderStatus,
    customerName,
    productName,
    hydrated,
  } = useApp();
  const [tab, setTab] = useState<Tab>("pick");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      [...orders]
        .filter(
          (o) => o.Order_Status === "待確認" || o.Order_Status === "處理中",
        )
        .sort((a, b) => {
          const d = a.Order_Date.localeCompare(b.Order_Date);
          return d !== 0 ? d : a.Order_ID.localeCompare(b.Order_ID);
        }),
    [orders],
  );

  const shipped = useMemo(
    () =>
      [...orders]
        .filter((o) => o.Order_Status === "已出貨")
        .sort((a, b) => {
          const d = b.Order_Date.localeCompare(a.Order_Date);
          return d !== 0 ? d : b.Order_ID.localeCompare(a.Order_ID);
        }),
    [orders],
  );

  const selected: SalesOrder | undefined = selectedId
    ? pending.find((o) => o.Order_ID === selectedId)
    : pending[0];

  const activeId = selected?.Order_ID ?? null;

  const pick = useMemo(() => {
    if (!activeId) return null;
    return previewShipStock(activeId, orderDetails, products);
  }, [activeId, orderDetails, products]);

  const details = useMemo(
    () =>
      activeId
        ? orderDetails.filter((d) => d.Order_ID === activeId)
        : [],
    [activeId, orderDetails],
  );

  function shipOrder(orderId: string) {
    setFlash(null);
    setError(null);
    const result = setOrderStatus(orderId, "已出貨");
    if (!result.ok) {
      setError(result.message ?? "出貨失敗");
      return;
    }
    setFlash(result.message ?? "已出貨");
    setSelectedId(null);
    setTab("shipped");
  }

  function markProcessing(orderId: string) {
    setFlash(null);
    setError(null);
    const result = setOrderStatus(orderId, "處理中");
    if (!result.ok) {
      setError(result.message ?? "更新失敗");
      return;
    }
    setFlash(result.message ?? "已改為處理中");
  }

  function unship(orderId: string) {
    setFlash(null);
    setError(null);
    const result = setOrderStatus(orderId, "處理中");
    if (!result.ok) {
      setError(result.message ?? "取消出貨失敗");
      return;
    }
    setFlash(result.message ?? "已取消出貨並還原庫存");
    setTab("pick");
    setSelectedId(orderId);
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="出貨" description="第 11 週" />
        <Notice kind="info">正在載入本機資料…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="出貨"
        description="揀貨清單 · 庫存檢核 · 確認出貨（扣庫＋產生應收｜第 11 週）"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/orders/" className="btn-ghost text-sm">
              訂單
            </Link>
            <Link href="/inventory/" className="btn-ghost text-sm">
              庫存
            </Link>
            <Link href="/receivables/" className="btn-ghost text-sm">
              應收
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        待確認／處理中訂單可在此揀貨並「確認出貨」。出貨會呼叫與訂單相同的扣庫與應收邏輯；庫存不足時會阻擋。已收款的應收不可取消出貨。
      </Notice>

      {flash && (
        <div className="animate-success-flash">
          <Notice kind="info">{flash}</Notice>
        </div>
      )}
      {error && (
        <Notice kind="error" title="無法完成出貨動作">
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {(
          [
            { id: "pick" as const, label: `待揀貨（${pending.length}）` },
            { id: "shipped" as const, label: `已出貨（${shipped.length}）` },
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

      {tab === "pick" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <section className="space-y-2">
            <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
              待出貨訂單
            </h2>
            {pending.length === 0 ? (
              <Notice kind="empty">目前沒有待確認或處理中的訂單</Notice>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)] border border-[var(--border)] bg-[var(--surface)]">
                {pending.map((o) => {
                  const preview = previewShipStock(
                    o.Order_ID,
                    orderDetails,
                    products,
                  );
                  const active = activeId === o.Order_ID;
                  return (
                    <li key={o.Order_ID}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(o.Order_ID)}
                        className={`flex w-full items-start justify-between gap-3 px-3.5 py-3 text-left transition ${
                          active
                            ? "bg-[var(--brand-soft)]/55"
                            : "hover:bg-[var(--linen)]/70"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-semibold text-[var(--brand)]">
                            {o.Order_ID}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                            {o.Order_Date} · {o.Customer_ID}{" "}
                            {customerName(o.Customer_ID)}
                          </p>
                          <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">
                            NT$ {formatTwd(o.Total_Amount)} ·{" "}
                            {preview.ok ? (
                              <span className="text-[var(--brand)]">庫存足夠</span>
                            ) : (
                              <span className="text-[var(--danger)]">庫存不足</span>
                            )}
                          </p>
                        </div>
                        <StatusBadge status={o.Order_Status} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
              揀貨單
            </h2>
            {!selected ? (
              <Notice kind="empty">請從左側選擇一筆待出貨訂單</Notice>
            ) : (
              <>
                <div className="panel grid gap-2 px-4 py-3.5 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-[var(--muted)]">訂單</span>{" "}
                    <Link
                      href={`/orders/${selected.Order_ID}/`}
                      className="font-mono text-[var(--brand)] underline-offset-2 hover:underline"
                    >
                      {selected.Order_ID}
                    </Link>
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-[var(--muted)]">狀態</span>
                    <StatusBadge status={selected.Order_Status} />
                  </p>
                  <p>
                    <span className="text-[var(--muted)]">客戶</span>{" "}
                    {selected.Customer_ID} {customerName(selected.Customer_ID)}
                  </p>
                  <p>
                    <span className="text-[var(--muted)]">金額</span>{" "}
                    <span className="tabular-nums font-medium">
                      NT$ {formatTwd(selected.Total_Amount)}
                    </span>
                  </p>
                </div>

                {details.length === 0 ? (
                  <Notice kind="empty">此訂單無明細，無法出貨</Notice>
                ) : (
                  <div className="table-shell">
                    <table>
                      <thead>
                        <tr>
                          <th>商品</th>
                          <th>需求 Qty</th>
                          <th>On_Hand</th>
                          <th>檢核</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(pick?.lines ?? []).map((line) => (
                          <tr key={line.Product_ID}>
                            <td>
                              {line.Product_ID} {productName(line.Product_ID)}
                            </td>
                            <td className="tabular-nums">
                              {line.Qty}
                              {line.Unit ? ` ${line.Unit}` : ""}
                            </td>
                            <td
                              className={`tabular-nums ${
                                line.enough ? "" : "text-[var(--danger)]"
                              }`}
                            >
                              {line.On_Hand}
                              {line.Unit ? ` ${line.Unit}` : ""}
                            </td>
                            <td>
                              {line.enough ? (
                                <span className="text-[var(--brand)]">可揀</span>
                              ) : (
                                <span className="text-[var(--danger)]">不足</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!pick?.ok && pick && pick.shortages.length > 0 ? (
                  <Notice kind="error" title="庫存不足，無法出貨">
                    {pick.shortages.join("；")}。可至庫存由 Admin 調整後再試。
                  </Notice>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {selected.Order_Status === "待確認" ? (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => markProcessing(selected.Order_ID)}
                    >
                      改為處理中
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!pick?.ok}
                    onClick={() => shipOrder(selected.Order_ID)}
                  >
                    確認出貨
                  </button>
                  <Link
                    href={`/orders/${selected.Order_ID}/`}
                    className="btn-ghost"
                  >
                    訂單詳情
                  </Link>
                </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
            已出貨清單
          </h2>
          {shipped.length === 0 ? (
            <Notice kind="empty">尚無已出貨訂單</Notice>
          ) : (
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Order_ID</th>
                    <th>日期</th>
                    <th>客戶</th>
                    <th>金額</th>
                    <th>庫存</th>
                    <th>應收</th>
                    <th>動作</th>
                  </tr>
                </thead>
                <tbody>
                  {shipped.map((o) => {
                    const ar = receivables.find(
                      (r) =>
                        r.Order_ID === o.Order_ID && r.Status !== "已作廢",
                    );
                    return (
                      <tr key={o.Order_ID}>
                        <td>
                          <Link
                            href={`/orders/${o.Order_ID}/`}
                            className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                          >
                            {o.Order_ID}
                          </Link>
                        </td>
                        <td>{o.Order_Date}</td>
                        <td>
                          {o.Customer_ID} {customerName(o.Customer_ID)}
                        </td>
                        <td className="tabular-nums">
                          NT$ {formatTwd(o.Total_Amount)}
                        </td>
                        <td>{o.Stock_Deducted ? "已扣庫" : "未扣庫"}</td>
                        <td>
                          {ar ? (
                            <Link
                              href="/receivables/"
                              className="text-[var(--brand)] underline-offset-2 hover:underline"
                            >
                              {ar.AR_ID}（{ar.Status}）
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            onClick={() => unship(o.Order_ID)}
                          >
                            取消出貨
                          </button>
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
    </div>
  );
}
