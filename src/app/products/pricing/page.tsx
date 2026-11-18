"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";

/** 價格設定：從產品主檔拆出，課堂更好找 */
export default function PricingPage() {
  const { products, currentUser, updateProduct, hydrated } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products
      .filter((p) => p.Is_Active)
      .filter((p) => {
        if (!needle) return true;
        return (
          p.Product_ID.toLowerCase().includes(needle) ||
          p.Product_Name.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => a.Product_ID.localeCompare(b.Product_ID));
  }, [products, q]);

  function savePrice(productId: string) {
    setFlash(null);
    setError(null);
    if (!isAdmin) {
      setError("Staff 不能改牌價；請切換 Admin 或請管理者協助。");
      return;
    }
    const raw = drafts[productId];
    const n = Number.parseInt(raw ?? "", 10);
    const result = updateProduct(productId, { List_Price: n });
    if (!result.ok) {
      setError(result.message ?? "儲存失敗");
      return;
    }
    setFlash(`已更新 ${productId} 牌價`);
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="價格設定" />
        <Notice kind="info">載入中…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="價格設定"
        description="List_Price＝目前參考售價；報價／訂單單價為當下快照，不會被這裡改回去。"
        actions={
          <Link href="/products/" className="btn-ghost text-sm">
            產品主檔
          </Link>
        }
      />
      <Notice kind="info">
        身分：{currentUser.Role}。
        {isAdmin ? "可修改牌價。" : "只能查看；改價會被拒絕並說明原因。"}
      </Notice>
      {flash && <Notice kind="info">{flash}</Notice>}
      {error && (
        <Notice kind="error" title="無法改價">
          {error}
        </Notice>
      )}
      <input
        className="field max-w-md text-sm"
        placeholder="搜尋商品"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>商品</th>
              <th>單位</th>
              <th>目前牌價</th>
              <th>成本</th>
              {isAdmin ? <th>新牌價</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.Product_ID}>
                <td>
                  <span className="font-mono text-xs">{p.Product_ID}</span>
                  <div className="text-sm">{p.Product_Name}</div>
                </td>
                <td>{p.Unit}</td>
                <td className="tabular-nums">NT$ {formatTwd(p.List_Price)}</td>
                <td className="tabular-nums text-[var(--muted)]">
                  NT$ {formatTwd(p.Cost)}
                </td>
                {isAdmin ? (
                  <td>
                    <div className="flex gap-1">
                      <input
                        className="field w-24 text-sm"
                        value={drafts[p.Product_ID] ?? String(p.List_Price)}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [p.Product_ID]: e.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="btn-primary text-xs"
                        onClick={() => savePrice(p.Product_ID)}
                      >
                        儲存
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
