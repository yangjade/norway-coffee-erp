"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { Notice, PageHeader } from "@/components/Notice";
import type { Product } from "@/lib/types";

export default function ProductsPage() {
  const { products, updateProduct, currentUser } = useApp();
  const isAdmin = currentUser.Role === "Admin";

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="商品"
        description={
          isAdmin
            ? "樣本列表 · 管理者可改單價／上架狀態（同步至本機）"
            : "唯讀樣本 · 對應 Product（咖啡商品教學售價）"
        }
        actions={
          <Link
            href="/"
            className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
          >
            返回首頁
          </Link>
        }
      />

      {isAdmin ? (
        <Notice kind="info">
          單價為教學用；變更會寫入本機並與訂單明細顯示名稱同步。
        </Notice>
      ) : (
        <Notice kind="reserved" footnote="此為未建置功能說明，不是權限不足。">
          員工僅供查閱；商品修改僅系統管理者可操作。
        </Notice>
      )}

      {products.length === 0 ? (
        <Notice kind="empty">目前沒有商品資料</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Product_ID</th>
                <th>商品名稱</th>
                <th>分類</th>
                <th>單價</th>
                <th>單位</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.Product_ID}>
                  <td className="font-mono text-xs">{p.Product_ID}</td>
                  <td>{p.Product_Name}</td>
                  <td>{p.Category}</td>
                  <td className="tabular-nums">
                    {isAdmin ? (
                      <input
                        type="number"
                        min={0}
                        step={1}
                        className="field w-24 tabular-nums"
                        value={p.Unit_Price}
                        aria-label={`${p.Product_ID} 單價`}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n >= 0) {
                            updateProduct(p.Product_ID, { Unit_Price: n });
                          }
                        }}
                      />
                    ) : (
                      <>NT$ {formatTwd(p.Unit_Price)}</>
                    )}
                  </td>
                  <td>{p.Unit}</td>
                  <td>
                    {isAdmin ? (
                      <select
                        className="field text-xs"
                        value={p.Status}
                        aria-label={`${p.Product_ID} 狀態`}
                        onChange={(e) =>
                          updateProduct(p.Product_ID, {
                            Status: e.target.value as Product["Status"],
                          })
                        }
                      >
                        <option value="上架">上架</option>
                        <option value="下架">下架</option>
                      </select>
                    ) : (
                      p.Status
                    )}
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
