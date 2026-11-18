"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  alertCounts,
  buildInventoryRows,
  createStockMove,
  postStockMove,
  setSafetyStock,
} from "@/lib/inventory-rules";
import { Notice, PageHeader } from "@/components/Notice";
import type { StockMoveType } from "@/lib/types";

export default function InventoryPage() {
  const {
    products,
    stockMoves,
    stockReservations,
    setProducts,
    setStockMoves,
    currentUser,
    hydrated,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const [q, setQ] = useState("");
  const [alertFilter, setAlertFilter] = useState<"全部" | "正常" | "低庫存" | "缺貨">(
    "全部",
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moveProduct, setMoveProduct] = useState("P002");
  const [moveType, setMoveType] = useState<StockMoveType>("入庫");
  const [moveQty, setMoveQty] = useState("10");
  const [countQty, setCountQty] = useState("");
  const [safetyEdits, setSafetyEdits] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const all = buildInventoryRows(products, stockMoves, stockReservations);
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (alertFilter !== "全部" && r.Alert !== alertFilter) return false;
      if (!needle) return true;
      return (
        r.Product_ID.toLowerCase().includes(needle) ||
        r.Product_Name.toLowerCase().includes(needle)
      );
    });
  }, [products, stockMoves, stockReservations, q, alertFilter]);

  const counts = useMemo(
    () => alertCounts(buildInventoryRows(products, stockMoves, stockReservations)),
    [products, stockMoves, stockReservations],
  );

  const drafts = useMemo(
    () => stockMoves.filter((m) => (m.Status ?? "Posted") === "Draft"),
    [stockMoves],
  );

  const recent = useMemo(
    () =>
      [...stockMoves]
        .sort((a, b) => {
          const d = b.Move_Date.localeCompare(a.Move_Date);
          return d !== 0 ? d : b.Move_ID.localeCompare(a.Move_ID);
        })
        .slice(0, 15),
    [stockMoves],
  );

  function runCreate(asDraft: boolean) {
    setFlash(null);
    setError(null);
    const n = Number.parseInt(moveQty, 10);
    const counted =
      moveType === "盤點調整" ? Number.parseInt(countQty, 10) : undefined;
    const result = createStockMove(
      {
        productId: moveProduct,
        moveType,
        qty: moveType === "盤點調整" ? 0 : n,
        role: currentUser.Role,
        countedQty: counted,
        asDraft,
      },
      products,
      stockMoves,
      stockReservations,
    );
    if (!result.ok) {
      setError(result.message ?? "失敗");
      if (result.products) setProducts(result.products);
      if (result.moves) setStockMoves(result.moves);
      return;
    }
    if (result.products) setProducts(result.products);
    if (result.moves) setStockMoves(result.moves);
    setFlash(result.message ?? "完成");
  }

  function runPost(moveId: string) {
    setFlash(null);
    setError(null);
    const result = postStockMove(
      moveId,
      currentUser.Role,
      products,
      stockMoves,
      stockReservations,
    );
    if (!result.ok) {
      setError(result.message ?? "過帳失敗");
      if (result.products) setProducts(result.products);
      if (result.moves) setStockMoves(result.moves);
      return;
    }
    if (result.products) setProducts(result.products);
    if (result.moves) setStockMoves(result.moves);
    setFlash(result.message ?? "已過帳");
  }

  function runSafety(productId: string) {
    setFlash(null);
    setError(null);
    const raw = safetyEdits[productId] ?? "";
    const n = Number.parseInt(raw, 10);
    const result = setSafetyStock(productId, n, products, currentUser.Role);
    if (!result.ok) {
      setError(result.message ?? "設定失敗");
      return;
    }
    if (result.products) setProducts(result.products);
    setFlash(result.message ?? "已設定");
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="庫存" description="第 10 週" />
        <Notice kind="info">正在載入本機資料…</Notice>
      </div>
    );
  }

  return (
    <div
      className="space-y-5 animate-rise"
      data-week10-marker="week10-inventory-20261118"
    >
      <PageHeader
        title="庫存"
        description="挪威的咖啡 · 教學倉 WH01 · 一眼看現有／保留／可用"
        actions={
          <Link href="/acceptance/" className="btn-ghost text-sm">
            驗收 01–12
          </Link>
        }
      />

      <Notice kind="info">
        <strong className="font-medium text-[var(--brand-deep)]">怎麼讀：</strong>
        現有＝倉庫裡還在的；保留＝已答應給訂單、還沒出貨；可用＝現有−保留（才能接新單）。
        確認訂單只加保留、不扣現有。低庫存仍可接單；缺貨＝可用 0。
        <span className="mt-1 block text-[var(--muted)]">
          現況：正常 {counts.normal} · 低庫存 {counts.low} · 缺貨 {counts.out}
        </span>
      </Notice>

      {flash && <Notice kind="info">{flash}</Notice>}
      {error && (
        <Notice kind="error" title="說清楚發生什麼事">
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[12rem] flex-1 text-xs text-[var(--muted)]">
          搜尋
          <input
            className="field mt-1 w-full text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="商品編號／名稱"
          />
        </label>
        <label className="block text-xs text-[var(--muted)]">
          警示
          <select
            className="field mt-1 text-sm"
            value={alertFilter}
            onChange={(e) =>
              setAlertFilter(e.target.value as typeof alertFilter)
            }
          >
            <option value="全部">全部</option>
            <option value="正常">正常</option>
            <option value="低庫存">低庫存</option>
            <option value="缺貨">缺貨</option>
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <Notice kind="empty">沒有符合的庫存列</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>商品</th>
                <th>倉</th>
                <th>單位</th>
                <th title="倉庫裡還在的數量">現有</th>
                <th title="已答應訂單、尚未出貨">保留</th>
                <th title="現有 − 保留">可用</th>
                <th>安全</th>
                <th>警示</th>
                {isAdmin ? <th>安全量</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.Product_ID}
                  className={
                    r.Alert === "缺貨"
                      ? "bg-[var(--danger-bg)]/60"
                      : r.Alert === "低庫存"
                        ? "bg-[var(--warn-bg)]/70"
                        : undefined
                  }
                >
                  <td>
                    <span className="font-mono text-xs">{r.Product_ID}</span>
                    <div className="text-sm">{r.Product_Name}</div>
                    {r.Hold_Allocation ? (
                      <div className="text-xs text-[var(--danger)]">
                        盤點異常：暫停新保留／出庫
                      </div>
                    ) : null}
                  </td>
                  <td className="font-mono text-xs">{r.Warehouse_ID}</td>
                  <td>{r.Unit}</td>
                  <td className="tabular-nums text-[var(--muted)]">{r.On_Hand}</td>
                  <td className="tabular-nums text-[var(--accent)]">
                    {r.Reserved}
                  </td>
                  <td
                    className={`tabular-nums text-base font-semibold ${
                      r.Available <= 0
                        ? "text-[var(--danger)]"
                        : "text-[var(--brand-deep)]"
                    }`}
                  >
                    {r.Available}
                  </td>
                  <td className="tabular-nums text-[var(--muted)]">
                    {r.Safety_Stock}
                  </td>
                  <td>
                    <span
                      className={
                        r.Alert === "缺貨"
                          ? "font-medium text-[var(--danger)]"
                          : r.Alert === "低庫存"
                            ? "font-medium text-[var(--espresso)]"
                            : "text-[var(--muted)]"
                      }
                    >
                      {r.Alert === "缺貨"
                        ? "缺貨（可用 0）"
                        : r.Alert === "低庫存"
                          ? "低庫存（≤安全）"
                          : "正常"}
                    </span>
                  </td>
                  {isAdmin ? (
                    <td>
                      <div className="flex items-center gap-1">
                        <input
                          className="field w-16 text-sm"
                          value={
                            safetyEdits[r.Product_ID] ?? String(r.Safety_Stock)
                          }
                          onChange={(e) =>
                            setSafetyEdits((prev) => ({
                              ...prev,
                              [r.Product_ID]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => runSafety(r.Product_ID)}
                        >
                          設
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-lg text-[var(--brand-deep)]">入出庫／盤點</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-[var(--muted)]">
            商品
            <select
              className="field mt-1 text-sm"
              value={moveProduct}
              onChange={(e) => setMoveProduct(e.target.value)}
            >
              {products
                .filter((p) => p.Is_Active)
                .map((p) => (
                  <option key={p.Product_ID} value={p.Product_ID}>
                    {p.Product_ID} {p.Product_Name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            類型
            <select
              className="field mt-1 text-sm"
              value={moveType}
              onChange={(e) => setMoveType(e.target.value as StockMoveType)}
            >
              <option value="期初">期初</option>
              <option value="入庫">入庫</option>
              <option value="出庫">出庫（非銷售）</option>
              <option value="盤點調整">盤點調整</option>
            </select>
          </label>
          {moveType === "盤點調整" ? (
            <label className="text-xs text-[var(--muted)]">
              實盤量
              <input
                className="field mt-1 w-24 text-sm"
                value={countQty}
                onChange={(e) => setCountQty(e.target.value)}
              />
            </label>
          ) : (
            <label className="text-xs text-[var(--muted)]">
              數量（正整數）
              <input
                className="field mt-1 w-24 text-sm"
                value={moveQty}
                onChange={(e) => setMoveQty(e.target.value)}
              />
            </label>
          )}
          <button type="button" className="btn-ghost text-sm" onClick={() => runCreate(true)}>
            存草稿
          </button>
          {isAdmin ? (
            <button type="button" className="btn-primary text-sm" onClick={() => runCreate(false)}>
              直接過帳
            </button>
          ) : (
            <span className="text-xs text-[var(--muted)]">Staff 可建草稿；過帳需 Admin</span>
          )}
        </div>
      </section>

      {drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">待過帳草稿</h2>
          <ul className="space-y-1 text-sm">
            {drafts.map((m) => (
              <li key={m.Move_ID} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{m.Move_ID}</span>
                <span>
                  {m.Move_Type ?? m.Reason} {m.Product_ID} {m.Qty > 0 ? "+" : ""}
                  {m.Qty}
                </span>
                {isAdmin ? (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => runPost(m.Move_ID)}
                  >
                    過帳
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium">異動紀錄</h2>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>編號</th>
                <th>來源</th>
                <th>商品</th>
                <th>類型</th>
                <th>數量</th>
                <th>狀態</th>
                <th>日期</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.Move_ID}>
                  <td className="font-mono text-xs">{m.Move_ID}</td>
                  <td className="font-mono text-xs">{m.Source_Doc_ID ?? "—"}</td>
                  <td>{m.Product_ID}</td>
                  <td>{m.Move_Type ?? m.Reason}</td>
                  <td className="tabular-nums">
                    {m.Qty > 0 ? "+" : ""}
                    {m.Qty}
                  </td>
                  <td>{m.Status ?? "Posted"}</td>
                  <td>{m.Move_Date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
