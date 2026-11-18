"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  alertCounts,
  buildInventoryRows,
} from "@/lib/inventory-rules";
import { Notice, PageHeader } from "@/components/Notice";
import { WAREHOUSE_ID } from "@/lib/types";

export default function InventoryPage() {
  const {
    products,
    stockMoves,
    stockReservations,
    setProducts,
    currentUser,
    hydrated,
    setProductSafety,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const [q, setQ] = useState("");
  const [alertFilter, setAlertFilter] = useState<"全部" | "正常" | "低庫存" | "缺貨">(
    "全部",
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [safetyEdits, setSafetyEdits] = useState<Record<string, string>>({});

  const allRows = useMemo(
    () => buildInventoryRows(products, stockMoves, stockReservations),
    [products, stockMoves, stockReservations],
  );

  const counts = useMemo(() => alertCounts(allRows), [allRows]);

  const activeReserveOrders = useMemo(() => {
    const ids = new Set(
      stockReservations.filter((r) => r.Is_Active).map((r) => r.Order_ID),
    );
    return ids.size;
  }, [stockReservations]);

  const holdCount = useMemo(
    () => allRows.filter((r) => r.Hold_Allocation).length,
    [allRows],
  );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allRows.filter((r) => {
      if (alertFilter !== "全部" && r.Alert !== alertFilter) return false;
      if (!needle) return true;
      return (
        r.Product_ID.toLowerCase().includes(needle) ||
        r.Product_Name.toLowerCase().includes(needle)
      );
    });
  }, [allRows, q, alertFilter]);

  function runSafety(productId: string) {
    setFlash(null);
    setError(null);
    const raw = safetyEdits[productId] ?? "";
    const n = Number.parseInt(raw, 10);
    const result = setProductSafety(productId, n);
    if (!result.ok) {
      setError(result.message ?? "設定失敗");
      return;
    }
    if (result.products) setProducts(result.products);
    setFlash(result.message ?? "已儲存安全量");
  }

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="庫存查詢與設定" description="第 10 週" />
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
        title="庫存查詢與設定 (W10)"
        description={`${WAREHOUSE_ID}｜挪威的咖啡教學倉 · 可用＝現有−保留`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/inventory/documents/" className="btn-ghost text-sm">
              庫存單據
            </Link>
            <Link href="/acceptance/#i01" className="btn-primary text-sm">
              I 驗收
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        <strong className="text-[var(--brand-deep)]">第 11 週出貨</strong>
        才會同時減少「現有量」與對應「保留量」。本週確認訂單只加保留、不扣現有。
        資料在本機 localStorage；身分 {currentUser.User_Name}（{currentUser.Role}
        ）{isAdmin ? "可改安全量／過帳" : "僅查詢與建草稿"}。
      </Notice>

      <div className="inv-summary-grid">
        <div className="inv-summary-card" style={{ borderLeftColor: "#c4a574" }}>
          <div className="label">低庫存品項數</div>
          <div className="value">{counts.low}</div>
          <div className="hint">0 &lt; 可用 ≤ 安全量；件數不跨單位加總</div>
        </div>
        <div className="inv-summary-card" style={{ borderLeftColor: "#b56a62" }}>
          <div className="label">缺貨品項數</div>
          <div className="value">{counts.out}</div>
          <div className="hint">可用＝0（仍可查，不自動禁單）</div>
        </div>
        <div className="inv-summary-card" style={{ borderLeftColor: "#6f8f78" }}>
          <div className="label">有效保留訂單</div>
          <div className="value">{activeReserveOrders}</div>
          <div className="hint">至少一筆有效保留的訂單張數</div>
        </div>
        <div className="inv-summary-card" style={{ borderLeftColor: "#8a9aa8" }}>
          <div className="label">盤點異常待處理</div>
          <div className="value">{holdCount}</div>
          <div className="hint">實盤低於保留：暫停新保留／出庫</div>
        </div>
      </div>

      {flash && <Notice kind="info">{flash}</Notice>}
      {error && (
        <Notice kind="error" title="說清楚發生什麼事">
          {error}
        </Notice>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-lg text-[var(--brand-deep)]">
            庫存列表（商品 × 倉庫）
          </h2>
          <span className="rounded-full bg-[var(--mist-blue)]/70 px-2.5 py-1 text-[11px] text-[var(--brand-deep)]">
            {rows.length} 項顯示中
          </span>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] flex-1 text-xs text-[var(--muted)]">
            搜尋商品
            <input
              className="field mt-1 w-full text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="編號／名稱"
            />
          </label>
          <label className="block text-xs text-[var(--muted)]">
            倉庫
            <select className="field mt-1 text-sm" value={WAREHOUSE_ID} disabled>
              <option value={WAREHOUSE_ID}>
                {WAREHOUSE_ID}｜挪威的咖啡教學倉
              </option>
            </select>
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
              <option value="全部">全部警示</option>
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
                  <th>倉庫</th>
                  <th>單位</th>
                  <th>現有量</th>
                  <th>保留量</th>
                  <th>可用量</th>
                  <th>安全量</th>
                  <th>警示</th>
                  <th>操作</th>
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
                    <td className="tabular-nums text-[var(--muted)]">
                      {r.On_Hand}
                    </td>
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
                    <td>
                      {isAdmin ? (
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
                      ) : (
                        <span className="tabular-nums">{r.Safety_Stock}</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          r.Alert === "缺貨"
                            ? "inline-flex rounded-full bg-[var(--danger-bg)] px-2 py-0.5 text-xs font-medium text-[var(--danger)]"
                            : r.Alert === "低庫存"
                              ? "inline-flex rounded-full bg-[var(--warn-bg)] px-2 py-0.5 text-xs font-medium text-[var(--espresso)]"
                              : "text-[var(--muted)] text-xs"
                        }
                      >
                        {r.Alert === "缺貨"
                          ? "缺貨"
                          : r.Alert === "低庫存"
                            ? "低庫存"
                            : "正常"}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {isAdmin ? (
                          <button
                            type="button"
                            className="btn-primary text-xs"
                            onClick={() => runSafety(r.Product_ID)}
                          >
                            儲存安全量
                          </button>
                        ) : null}
                        <Link
                          href="/inventory/documents/"
                          className="btn-ghost text-xs"
                        >
                          異動
                        </Link>
                        <Link
                          href="/inventory/reservations/"
                          className="btn-ghost text-xs"
                        >
                          保留
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
