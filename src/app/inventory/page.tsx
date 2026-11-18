"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { Notice, PageHeader } from "@/components/Notice";

export default function InventoryPage() {
  const {
    products,
    stockMoves,
    adjustInventory,
    currentUser,
    productName,
    hydrated,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deltas, setDeltas] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => {
        if (!needle) return true;
        return (
          p.Product_ID.toLowerCase().includes(needle) ||
          p.Product_Name.toLowerCase().includes(needle) ||
          p.Category.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.Product_ID.localeCompare(b.Product_ID));
  }, [products, q]);

  const recentMoves = useMemo(
    () =>
      [...stockMoves]
        .sort((a, b) => {
          const d = b.Move_Date.localeCompare(a.Move_Date);
          return d !== 0 ? d : b.Move_ID.localeCompare(a.Move_ID);
        })
        .slice(0, 12),
    [stockMoves],
  );

  function applyDelta(productId: string) {
    setFlash(null);
    setError(null);
    const raw = deltas[productId]?.trim() ?? "";
    const n = Number.parseInt(raw, 10);
    if (!Number.isInteger(n) || n === 0) {
      setError("請輸入非零整數調整量（正數入庫、負數出庫）。");
      return;
    }
    const result = adjustInventory(productId, n);
    if (!result.ok) {
      setError(result.message ?? "調整失敗");
      return;
    }
    setFlash(result.message ?? "已調整");
    setDeltas((prev) => ({ ...prev, [productId]: "" }));
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
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="庫存"
        description="商品現有量 On_Hand · 出貨自動扣庫 · 教學級單倉（第 10 週）"
        actions={
          <Link href="/products/" className="btn-ghost text-sm">
            商品主檔
          </Link>
        }
      />

      <Notice kind="info">
        於「出貨」確認或訂單改為「已出貨」時會依明細 Qty 扣減 On_Hand 並寫入異動；改回非出貨狀態會還原（若應收已收款則阻擋）。Admin
        可手動調整；Staff 僅查閱。無多倉／調撥／安全存量警報。
      </Notice>

      {flash && (
        <div className="animate-success-flash">
          <Notice kind="info">{flash}</Notice>
        </div>
      )}
      {error && (
        <Notice kind="error" title="無法調整">
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[12rem] flex-1 text-xs text-[var(--muted)]">
          搜尋商品
          <input
            className="field mt-1 w-full text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="編號／名稱／分類"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <Notice kind="empty">沒有符合的商品</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Product_ID</th>
                <th>名稱</th>
                <th>分類</th>
                <th>單位</th>
                <th>On_Hand</th>
                <th>牌價</th>
                <th>啟用</th>
                {isAdmin ? <th>手動調整</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.Product_ID}>
                  <td>
                    <Link
                      href={`/products/${p.Product_ID}/`}
                      className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                    >
                      {p.Product_ID}
                    </Link>
                  </td>
                  <td>{p.Product_Name}</td>
                  <td>{p.Category}</td>
                  <td>{p.Unit}</td>
                  <td
                    className={`tabular-nums font-medium ${
                      p.On_Hand <= 5 ? "text-[var(--danger)]" : ""
                    }`}
                  >
                    {p.On_Hand}
                  </td>
                  <td className="tabular-nums">
                    NT$ {formatTwd(p.List_Price)}
                  </td>
                  <td>{p.Is_Active ? "啟用" : "停用"}</td>
                  {isAdmin ? (
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          className="field w-20 text-xs"
                          inputMode="numeric"
                          placeholder="+/-"
                          aria-label={`調整 ${p.Product_ID}`}
                          value={deltas[p.Product_ID] ?? ""}
                          onChange={(e) =>
                            setDeltas((prev) => ({
                              ...prev,
                              [p.Product_ID]: e.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="btn-ghost text-xs"
                          onClick={() => applyDelta(p.Product_ID)}
                        >
                          套用
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

      <section className="space-y-2">
        <h2 className="font-display text-sm tracking-[0.08em] text-[var(--wood)]">
          最近庫存異動
        </h2>
        {recentMoves.length === 0 ? (
          <Notice kind="empty">尚無異動紀錄</Notice>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Move_ID</th>
                  <th>日期</th>
                  <th>商品</th>
                  <th>數量</th>
                  <th>原因</th>
                  <th>參照訂單</th>
                  <th>備註</th>
                </tr>
              </thead>
              <tbody>
                {recentMoves.map((m) => (
                  <tr key={m.Move_ID}>
                    <td className="font-mono text-xs">{m.Move_ID}</td>
                    <td>{m.Move_Date}</td>
                    <td>
                      {m.Product_ID} {productName(m.Product_ID)}
                    </td>
                    <td
                      className={`tabular-nums ${
                        m.Qty < 0 ? "text-[var(--danger)]" : "text-[var(--brand)]"
                      }`}
                    >
                      {m.Qty > 0 ? `+${m.Qty}` : m.Qty}
                    </td>
                    <td>{m.Reason}</td>
                    <td>
                      {m.Ref_Order_ID ? (
                        <Link
                          href={`/orders/${m.Ref_Order_ID}/`}
                          className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                        >
                          {m.Ref_Order_ID}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {m.Note || "—"}
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
