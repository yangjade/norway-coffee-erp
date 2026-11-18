"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { useApp } from "@/lib/app-context";

export default function InventoryMovesPage() {
  const { stockMoves, hydrated, productName } = useApp();
  const [q, setQ] = useState("");
  const [type, setType] = useState("全部");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...stockMoves]
      .filter((m) => {
        const t = m.Move_Type ?? m.Reason;
        if (type !== "全部" && t !== type) return false;
        if (!needle) return true;
        return (
          m.Move_ID.toLowerCase().includes(needle) ||
          m.Product_ID.toLowerCase().includes(needle) ||
          (m.Source_Doc_ID || "").toLowerCase().includes(needle) ||
          productName(m.Product_ID).toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => {
        const d = b.Move_Date.localeCompare(a.Move_Date);
        return d !== 0 ? d : b.Move_ID.localeCompare(a.Move_ID);
      });
  }, [stockMoves, q, type, productName]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="庫存異動紀錄" />
        <Notice kind="info">載入中…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="庫存異動紀錄"
        description="追查每一次現有量變化：來源單號、類型、有正負號數量、狀態。"
        actions={
          <Link href="/inventory/documents/" className="btn-ghost text-sm">
            開立單據
          </Link>
        }
      />

      <div className="flex flex-wrap gap-3">
        <input
          className="field min-w-[12rem] flex-1 text-sm"
          placeholder="搜尋異動編號／商品／來源單號"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="全部">全部類型</option>
          <option value="期初">期初</option>
          <option value="入庫">入庫</option>
          <option value="出庫">出庫</option>
          <option value="盤點調整">盤點調整</option>
          <option value="出貨扣庫">出貨扣庫</option>
          <option value="手動調整">手動調整</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <Notice kind="empty">沒有符合的異動</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>異動編號</th>
                <th>來源單號</th>
                <th>商品</th>
                <th>類型</th>
                <th>數量</th>
                <th>狀態</th>
                <th>日期</th>
                <th>說明</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.Move_ID}>
                  <td className="font-mono text-xs">{m.Move_ID}</td>
                  <td className="font-mono text-xs">
                    {m.Source_Doc_ID ?? m.Ref_Order_ID ?? "—"}
                  </td>
                  <td>
                    <span className="font-mono text-xs">{m.Product_ID}</span>
                    <div className="text-xs text-[var(--muted)]">
                      {productName(m.Product_ID)}
                    </div>
                  </td>
                  <td>{m.Move_Type ?? m.Reason}</td>
                  <td className="tabular-nums font-medium">
                    {m.Qty > 0 ? "+" : ""}
                    {m.Qty}
                  </td>
                  <td>{m.Status ?? "Posted"}</td>
                  <td>{m.Move_Date}</td>
                  <td className="max-w-[14rem] truncate text-xs text-[var(--muted)]">
                    {m.Note ?? "—"}
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
