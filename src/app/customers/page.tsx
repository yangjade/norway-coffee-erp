"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LoadingState, Notice, PageHeader } from "@/components/Notice";
import { PaginationBar } from "@/components/PaginationBar";
import { useToast } from "@/components/ToastProvider";
import { useApp } from "@/lib/app-context";
import {
  CUSTOMER_TYPES,
  activeLabel,
  formatCredit,
} from "@/lib/customer-rules";
import {
  reactivateConfirmMessage,
  softDeleteConfirmMessage,
} from "@/lib/customer-soft-delete";
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/list-utils";
import type { CustomerType } from "@/lib/types";

type ActiveFilter = "all" | "active" | "inactive";

export default function CustomersPage() {
  const {
    customers,
    hydrated,
    currentUser,
    softDeleteCustomer,
    setCustomerActive,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CustomerType>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [flash, setFlash] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"id" | "name">("id");
  const { pushToast } = useToast();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...customers]
      .filter((c) => {
        if (typeFilter !== "all" && c.Customer_Type !== typeFilter) return false;
        if (activeFilter === "active" && !c.Is_Active) return false;
        if (activeFilter === "inactive" && c.Is_Active) return false;
        if (!needle) return true;
        return (
          c.Customer_ID.toLowerCase().includes(needle) ||
          c.Customer_Name.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) =>
        sort === "name"
          ? a.Customer_Name.localeCompare(b.Customer_Name, "zh-Hant")
          : a.Customer_ID.localeCompare(b.Customer_ID),
      );
  }, [customers, q, typeFilter, activeFilter, sort]);

  const { pageRows, page: safePage, pageCount, total } = paginate(
    filtered,
    page,
    DEFAULT_PAGE_SIZE,
  );

  function onRowSoftDelete(id: string, name: string) {
    if (!window.confirm(softDeleteConfirmMessage(id, name))) return;
    const result = softDeleteCustomer(id);
    const msg = result.ok
      ? `已刪除／停用 ${id}（軟刪除；列表與訂單仍可查）`
      : result.message ?? "操作失敗";
    setFlash(msg);
    pushToast({ tone: result.ok ? "success" : "error", message: msg });
  }

  function onRowReactivate(id: string, name: string) {
    if (!window.confirm(reactivateConfirmMessage(id, name))) return;
    const result = setCustomerActive(id, true);
    const msg = result.ok ? `已重新啟用 ${id}` : result.message ?? "操作失敗";
    setFlash(msg);
    pushToast({ tone: result.ok ? "success" : "error", message: msg });
  }

  if (!hydrated) {
    return <LoadingState title="客戶" />;
  }

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="客戶"
        description="客戶主檔：搜尋、篩選、排序、分頁。刪除＝停用（無實體刪除），歷史訂單仍可查。"
        actions={
          <Link href="/customers/new/" className="btn-primary">
            新增客戶
          </Link>
        }
      />

      <Notice kind="info">
        管理者可維護付款條件與信用額度，並以「刪除／停用」軟刪除。員工可新增與修改名稱／分類／聯絡，不可刪除或改信控。目前身分：
        {isAdmin ? "系統管理者" : "一般使用者"}。
      </Notice>

      {flash && <Notice kind="info">{flash}</Notice>}

      <div className="filter-bar grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-[var(--muted)]">
          搜尋（編號或名稱）
          <input
            className="field mt-1.5 w-full"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="例如：C002、峽灣"
            aria-label="搜尋客戶"
          />
        </label>
        <label className="block text-xs text-[var(--muted)]">
          客戶分類
          <select
            className="field mt-1.5 w-full"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "all" | CustomerType);
              setPage(1);
            }}
          >
            <option value="all">全部</option>
            {CUSTOMER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-[var(--muted)]">
          啟用狀態
          <select
            className="field mt-1.5 w-full"
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as ActiveFilter);
              setPage(1);
            }}
          >
            <option value="all">全部（含停用）</option>
            <option value="active">僅啟用</option>
            <option value="inactive">僅停用</option>
          </select>
        </label>
        <label className="block text-xs text-[var(--muted)]">
          排序
          <select
            className="field mt-1.5 w-full"
            value={sort}
            onChange={(e) => setSort(e.target.value as "id" | "name")}
          >
            <option value="id">編號</option>
            <option value="name">名稱</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-[var(--muted)]">
        顯示 {filtered.length}／共 {customers.length} 位（含停用；搜尋與篩選採交集）
      </p>

      {filtered.length === 0 ? (
        <Notice
          kind="empty"
          title={customers.length === 0 ? "尚無客戶" : "無符合條件的客戶"}
        >
          {customers.length === 0 ? (
            <>
              目前沒有客戶資料。可先新增一位客戶主檔。
              <div className="mt-4">
                <Link href="/customers/new/" className="btn-primary">
                  新增客戶
                </Link>
              </div>
            </>
          ) : (
            <>
              沒有符合搜尋／篩選條件的客戶。可清除條件，或新增客戶。
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setQ("");
                    setTypeFilter("all");
                    setActiveFilter("all");
                    setPage(1);
                  }}
                >
                  清除條件
                </button>
                <Link href="/customers/new/" className="btn-primary">
                  新增客戶
                </Link>
              </div>
            </>
          )}
        </Notice>
      ) : (
        <>
          <div className="table-shell table-dense overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Customer_ID</th>
                  <th>客戶名稱</th>
                  <th>分類</th>
                  <th>付款條件</th>
                  <th className="text-right">額度</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr
                    key={c.Customer_ID}
                    className={!c.Is_Active ? "opacity-70" : undefined}
                  >
                    <td className="font-mono text-xs">{c.Customer_ID}</td>
                    <td>{c.Customer_Name}</td>
                    <td>{c.Customer_Type}</td>
                    <td>{c.Payment_Terms}</td>
                    <td className="text-right tabular-nums">
                      {formatCredit(c.Credit_Limit)}
                    </td>
                    <td>
                      <span
                        className={
                          c.Is_Active
                            ? "text-[var(--brand)]"
                            : "text-[var(--danger)]"
                        }
                      >
                        {activeLabel(c.Is_Active)}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Link
                          href={`/customers/${c.Customer_ID}/`}
                          className="text-[var(--brand)] underline-offset-2 hover:underline"
                        >
                          查看
                        </Link>
                        <Link
                          href={`/customers/${c.Customer_ID}/edit/`}
                          className="text-[var(--brand)] underline-offset-2 hover:underline"
                        >
                          編輯
                        </Link>
                        {isAdmin &&
                          (c.Is_Active ? (
                            <button
                              type="button"
                              className="text-[var(--danger)] underline-offset-2 hover:underline"
                              onClick={() =>
                                onRowSoftDelete(c.Customer_ID, c.Customer_Name)
                              }
                            >
                              刪除／停用
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-[var(--brand)] underline-offset-2 hover:underline"
                              onClick={() =>
                                onRowReactivate(c.Customer_ID, c.Customer_Name)
                              }
                            >
                              重新啟用
                            </button>
                          ))}
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
