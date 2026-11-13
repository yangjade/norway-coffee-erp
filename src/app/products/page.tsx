"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { PRODUCT_CATEGORIES, activeProductLabel } from "@/lib/product-rules";
import { LoadingState, Notice, PageHeader } from "@/components/Notice";
import { PaginationBar } from "@/components/PaginationBar";
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/list-utils";

type ActiveFilter = "all" | "active" | "inactive";
type SortKey = "id" | "name" | "price-asc" | "price-desc";

export default function ProductsPage() {
  const { products, softDeactivateProduct, updateProduct, currentUser, hydrated } =
    useApp();
  const isAdmin = currentUser.Role === "Admin";
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"all" | string>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortKey>("id");
  const [flash, setFlash] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const min = minPrice.trim() === "" ? null : Number.parseInt(minPrice, 10);
    const max = maxPrice.trim() === "" ? null : Number.parseInt(maxPrice, 10);
    const rows = [...products].filter((p) => {
      if (cat !== "all" && p.Category !== cat) return false;
      if (activeFilter === "active" && !p.Is_Active) return false;
      if (activeFilter === "inactive" && p.Is_Active) return false;
      if (min != null && !Number.isNaN(min) && p.List_Price < min) return false;
      if (max != null && !Number.isNaN(max) && p.List_Price > max) return false;
      if (!needle) return true;
      return (
        p.Product_ID.toLowerCase().includes(needle) ||
        p.Product_Name.toLowerCase().includes(needle) ||
        p.Category.toLowerCase().includes(needle) ||
        (p.Description || "").toLowerCase().includes(needle)
      );
    });
    rows.sort((a, b) => {
      if (sort === "name") return a.Product_Name.localeCompare(b.Product_Name);
      if (sort === "price-asc") return a.List_Price - b.List_Price;
      if (sort === "price-desc") return b.List_Price - a.List_Price;
      return a.Product_ID.localeCompare(b.Product_ID);
    });
    return rows;
  }, [products, q, cat, activeFilter, minPrice, maxPrice, sort]);

  const { pageRows, page: safePage, pageCount, total } = paginate(
    filtered,
    page,
    DEFAULT_PAGE_SIZE,
  );

  if (!hydrated) {
    return <LoadingState title="商品" />;
  }

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="商品"
        description="產品主檔：牌價與成本、啟停用。刪除＝停用（歷史報價保留）。員工可新增，僅可改名稱／說明。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="text-sm text-[var(--brand)] underline-offset-4 hover:underline"
            >
              返回首頁
            </Link>
            <Link href="/products/new/" className="btn-primary">
              新增商品
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        主檔牌價為參考價；報價明細單價為交易快照，調價不會回寫舊報價。
        {!isAdmin && " 員工不可修改牌價、成本與啟停。"}
      </Notice>

      {flash && (
        <div className="animate-success-flash">
          <Notice kind="info">
            {flash}
            <button
              type="button"
              className="ml-2 text-[var(--brand)] underline underline-offset-4"
              onClick={() => setFlash(null)}
            >
              關閉
            </button>
          </Notice>
        </div>
      )}

      <div className="filter-bar">
        <input
          className="field min-w-[10rem] flex-1"
          placeholder="搜尋編號／名稱／分類／說明"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          aria-label="搜尋商品"
        />
        <select
          className="field"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="分類篩選"
        >
          <option value="all">全部分類</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
          aria-label="啟用篩選"
        >
          <option value="all">全部狀態</option>
          <option value="active">僅啟用</option>
          <option value="inactive">僅停用</option>
        </select>
        <input
          className="field w-24 tabular-nums"
          type="number"
          min={0}
          placeholder="最低價"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          aria-label="最低牌價"
        />
        <input
          className="field w-24 tabular-nums"
          type="number"
          min={0}
          placeholder="最高價"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          aria-label="最高牌價"
        />
        <select
          className="field"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="排序"
        >
          <option value="id">依編號</option>
          <option value="name">依名稱</option>
          <option value="price-asc">牌價低→高</option>
          <option value="price-desc">牌價高→低</option>
        </select>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => {
            setQ("");
            setCat("all");
            setActiveFilter("all");
            setMinPrice("");
            setMaxPrice("");
            setSort("id");
          }}
        >
          清除條件
        </button>
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        顯示 {filtered.length}／共 {products.length} 項
      </p>

      {products.length === 0 ? (
        <Notice kind="empty" title="尚無商品">
          請先新增商品，或按「重設樣本」還原教學資料。
          <div className="mt-3">
            <Link href="/products/new/" className="btn-primary">
              新增商品
            </Link>
          </div>
        </Notice>
      ) : filtered.length === 0 ? (
        <Notice kind="empty" title="沒有符合條件的商品">
          請調整搜尋／篩選，或清除條件後再試。
        </Notice>
      ) : (
        <>
        <div className="table-shell table-dense">
          <table>
            <thead>
              <tr>
                <th>商品編號</th>
                <th>商品名稱</th>
                <th>分類</th>
                <th>牌價</th>
                <th>成本</th>
                <th>庫存</th>
                <th>單位</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr
                  key={p.Product_ID}
                  className={!p.Is_Active ? "opacity-70" : undefined}
                >
                  <td className="font-mono text-xs">{p.Product_ID}</td>
                  <td>
                    <Link
                      href={`/products/${p.Product_ID}/`}
                      className="font-medium text-[var(--brand)] underline-offset-4 hover:underline"
                    >
                      {p.Product_Name}
                    </Link>
                  </td>
                  <td>{p.Category}</td>
                  <td className="tabular-nums">NT$ {formatTwd(p.List_Price)}</td>
                  <td className="tabular-nums text-[var(--muted)]">
                    {isAdmin ? `NT$ ${formatTwd(p.Cost)}` : "—"}
                  </td>
                  <td className="tabular-nums">{p.On_Hand}</td>
                  <td>{p.Unit}</td>
                  <td>
                    <span
                      className={
                        p.Is_Active
                          ? "text-[var(--brand)]"
                          : "text-[var(--danger)]"
                      }
                    >
                      {activeProductLabel(p.Is_Active)}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/products/${p.Product_ID}/edit/`}
                        className="text-xs text-[var(--brand)] underline-offset-4 hover:underline"
                      >
                        編輯
                      </Link>
                      {isAdmin && p.Is_Active && (
                        <button
                          type="button"
                          className="text-xs text-[var(--danger)] underline-offset-4 hover:underline"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `停用 ${p.Product_ID}「${p.Product_Name}」？歷史報價保留；不可加入新報價。`,
                              )
                            )
                              return;
                            const r = softDeactivateProduct(p.Product_ID);
                            setFlash(
                              r.ok
                                ? `已停用 ${p.Product_ID}`
                                : (r.message ?? "失敗"),
                            );
                          }}
                        >
                          停用
                        </button>
                      )}
                      {isAdmin && !p.Is_Active && (
                        <button
                          type="button"
                          className="text-xs text-[var(--brand)] underline-offset-4 hover:underline"
                          onClick={() => {
                            const r = updateProduct(p.Product_ID, {
                              Is_Active: true,
                            });
                            setFlash(
                              r.ok
                                ? `已重新啟用 ${p.Product_ID}`
                                : (r.message ?? "失敗"),
                            );
                          }}
                        >
                          啟用
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={safePage}
          pageCount={pageCount}
          total={total}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setPage}
        />
        </>
      )}
    </div>
  );
}
