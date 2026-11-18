"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { statusLabel } from "@/lib/quotation-rules";
import type { QuoteStatus } from "@/lib/types";
import { LoadingState, Notice, PageHeader } from "@/components/Notice";
import { PaginationBar } from "@/components/PaginationBar";
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/list-utils";

type SortKey = "id-desc" | "id-asc" | "date-desc" | "total-desc";

export default function QuotationsPage() {
  const { quotations, customerName, hydrated } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | QuoteStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SortKey>("id-desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = [...quotations].filter((row) => {
      if (status !== "all" && row.Status !== status) return false;
      if (dateFrom && row.Quote_Date < dateFrom) return false;
      if (dateTo && row.Quote_Date > dateTo) return false;
      if (!needle) return true;
      const cname = customerName(row.Customer_ID).toLowerCase();
      const notes = (row.Notes || "").toLowerCase();
      return (
        row.Quote_ID.toLowerCase().includes(needle) ||
        row.Customer_ID.toLowerCase().includes(needle) ||
        cname.includes(needle) ||
        notes.includes(needle) ||
        statusLabel(row.Status).includes(needle)
      );
    });
    rows.sort((a, b) => {
      if (sort === "id-asc") return a.Quote_ID.localeCompare(b.Quote_ID);
      if (sort === "date-desc") return b.Quote_Date.localeCompare(a.Quote_Date);
      if (sort === "total-desc") return b.Total - a.Total;
      return b.Quote_ID.localeCompare(a.Quote_ID);
    });
    return rows;
  }, [quotations, q, status, dateFrom, dateTo, sort, customerName]);

  const { pageRows, page: safePage, pageCount, total } = paginate(
    filtered,
    page,
    DEFAULT_PAGE_SIZE,
  );

  if (!hydrated) {
    return <LoadingState title="報價" />;
  }

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title="報價"
        description="報價表頭與明細：有效期限、狀態流轉（草稿→已送出→已接受／已拒絕／已到期）。稅額依元四捨五入 5%。"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="text-sm text-[var(--brand)] underline-offset-4 hover:underline"
            >
              返回首頁
            </Link>
            <Link href="/quotations/new/" className="btn-primary">
              新增報價
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        已送出後鎖定金額；若要重報請開新單。明細單價為快照，主檔調價不會覆寫舊報價。超過有效期限的「已送出」會自動標為「已到期」。
      </Notice>

      <div className="filter-bar">
        <input
          className="field min-w-[10rem] flex-1"
          placeholder="搜尋編號／客戶／備註／狀態"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          aria-label="搜尋報價"
        />
        <select
          className="field"
          value={status}
          onChange={(e) => { setStatus(e.target.value as "all" | QuoteStatus); setPage(1); }}
          aria-label="狀態篩選"
        >
          <option value="all">全部狀態</option>
          <option value="Draft">草稿</option>
          <option value="Sent">已送出</option>
          <option value="Accepted">已接受</option>
          <option value="Rejected">已拒絕</option>
          <option value="Expired">已到期</option>
        </select>
        <input
          className="field"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="報價日起"
        />
        <input
          className="field"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="報價日迄"
        />
        <select
          className="field"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="排序"
        >
          <option value="id-desc">編號新→舊</option>
          <option value="id-asc">編號舊→新</option>
          <option value="date-desc">報價日新→舊</option>
          <option value="total-desc">總額高→低</option>
        </select>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => {
            setQ("");
            setStatus("all");
            setDateFrom("");
            setDateTo("");
            setSort("id-desc");
          }}
        >
          清除條件
        </button>
      </div>

      <p className="text-xs leading-relaxed text-[var(--muted)]">
        顯示 {filtered.length}／共 {quotations.length} 筆
      </p>

      {quotations.length === 0 ? (
        <Notice kind="empty" title="尚無報價">
          請建立第一張報價，或重設樣本載入教學資料。
          <div className="mt-3">
            <Link href="/quotations/new/" className="btn-primary">
              新增報價
            </Link>
          </div>
        </Notice>
      ) : filtered.length === 0 ? (
        <Notice kind="empty" title="沒有符合條件的報價">
          請調整搜尋／狀態／日期篩選。
        </Notice>
      ) : (
        <>
        <div className="table-shell table-dense">
          <table>
            <thead>
              <tr>
                <th>報價編號</th>
                <th>客戶</th>
                <th>報價日</th>
                <th>有效期限</th>
                <th>狀態</th>
                <th>小計</th>
                <th>稅額</th>
                <th>總額</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.Quote_ID}>
                  <td>
                    <Link
                      href={`/quotations/${row.Quote_ID}/`}
                      className="font-mono text-xs font-medium text-[var(--brand)] underline-offset-4 hover:underline"
                    >
                      {row.Quote_ID}
                    </Link>
                  </td>
                  <td>
                    {row.Customer_ID} {customerName(row.Customer_ID)}
                  </td>
                  <td className="tabular-nums text-xs">{row.Quote_Date}</td>
                  <td className="tabular-nums text-xs">{row.Valid_Until}</td>
                  <td>
                    <span className="status-chip">
                      {statusLabel(row.Status)}
                    </span>
                  </td>
                  <td className="tabular-nums">
                    NT$ {formatTwd(row.Subtotal)}
                  </td>
                  <td className="tabular-nums">
                    NT$ {formatTwd(row.Tax_Amount)}
                  </td>
                  <td className="tabular-nums font-medium">
                    NT$ {formatTwd(row.Total)}
                  </td>
                  <td>
                    <Link
                      href={`/quotations/${row.Quote_ID}/`}
                      className="text-xs font-medium text-[var(--brand)] underline-offset-4 hover:underline"
                    >
                      查看詳情
                    </Link>
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
