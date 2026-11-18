"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { useApp } from "@/lib/app-context";

export default function InventoryReservationsPage() {
  const { stockReservations, hydrated, productName } = useApp();
  const [onlyActive, setOnlyActive] = useState(true);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...stockReservations]
      .filter((r) => (onlyActive ? r.Is_Active : true))
      .filter((r) => {
        if (!needle) return true;
        return (
          r.Order_ID.toLowerCase().includes(needle) ||
          r.Product_ID.toLowerCase().includes(needle) ||
          r.Reserve_ID.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.Created_At.localeCompare(a.Created_At));
  }, [stockReservations, onlyActive, q]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="訂單保留紀錄" />
        <Notice kind="info">載入中…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="訂單保留紀錄"
        description="確認訂單時建立；取消／重開會解除。計算保留量只加總「有效」列。"
        actions={
          <Link href="/orders/" className="btn-ghost text-sm">
            銷售訂單
          </Link>
        }
      />

      <Notice kind="info">
        保留≠出貨。貨還在倉庫（現有不變），只是先答應給這張訂單，所以可用量變少。
      </Notice>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="field min-w-[12rem] flex-1 text-sm"
          placeholder="搜尋訂單／商品／保留編號"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          只看有效保留
        </label>
      </div>

      {rows.length === 0 ? (
        <Notice kind="empty">目前沒有保留紀錄（可先確認一張訂單）</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>保留編號</th>
                <th>訂單</th>
                <th>明細</th>
                <th>商品</th>
                <th>倉庫</th>
                <th>數量</th>
                <th>狀態</th>
                <th>建立／解除</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.Reserve_ID}>
                  <td className="font-mono text-xs">{r.Reserve_ID}</td>
                  <td>
                    <Link
                      href={`/orders/${r.Order_ID}/`}
                      className="font-mono text-xs text-[var(--brand)] underline"
                    >
                      {r.Order_ID}
                    </Link>
                  </td>
                  <td className="font-mono text-xs">{r.Detail_ID}</td>
                  <td>
                    <span className="font-mono text-xs">{r.Product_ID}</span>
                    <div className="text-xs text-[var(--muted)]">
                      {productName(r.Product_ID)}
                    </div>
                  </td>
                  <td className="font-mono text-xs">{r.Warehouse_ID}</td>
                  <td className="tabular-nums font-medium">{r.Qty}</td>
                  <td>{r.Is_Active ? "有效" : "已解除"}</td>
                  <td className="text-xs text-[var(--muted)]">
                    {r.Created_At.slice(0, 19)}
                    {r.Released_At ? (
                      <>
                        <br />→ {r.Released_At.slice(0, 19)}
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
