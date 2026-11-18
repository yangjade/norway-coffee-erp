"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/list-utils";
import { ORDER_STATUSES, statusLabelZh } from "@/lib/order-rules";
import type { OrderStatus } from "@/lib/types";

export default function OrdersPage() {
  const { orders, currentUser, customerName, simLoadError } = useApp();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...orders]
      .filter((o) => {
        if (status !== "all" && o.Order_Status !== status) return false;
        if (dateFrom && o.Order_Date < dateFrom) return false;
        if (dateTo && o.Order_Date > dateTo) return false;
        if (!needle) return true;
        const name = customerName(o.Customer_ID).toLowerCase();
        return (
          o.Order_ID.toLowerCase().includes(needle) ||
          o.Customer_ID.toLowerCase().includes(needle) ||
          name.includes(needle) ||
          (o.Quote_ID || "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.Order_Date.localeCompare(a.Order_Date));
  }, [orders, q, status, dateFrom, dateTo, customerName]);

  const { pageRows, page: safePage, pageCount, total } = paginate(
    filtered,
    page,
    DEFAULT_PAGE_SIZE,
  );

  return (
    <div
      className="space-y-5 animate-rise"
      data-week8="orders-list"
      data-week8-marker="week8-official-20261118"
    >
      <PageHeader
        title="訂單"
        description="第 8 週：Draft／Confirmed／Cancelled；雙交期；確認不扣庫。"
        actions={
          <Link href="/quote-to-order/" className="text-sm text-[var(--brand)] underline">
            報價轉訂單
          </Link>
        }
      />

      <Notice kind="info">
        可依編號／客戶／日期區間／狀態查詢。身分：{currentUser.User_Name}。資料存本機
        localStorage（v6）。
      </Notice>

      {simLoadError ? (
        <Notice kind="error" title="載入失敗">
          請至驗收區重設樣本。
        </Notice>
      ) : (
        <>
          <div className="filter-bar">
            <input
              className="field min-w-[10rem] flex-1"
              placeholder="搜尋訂單／客戶／來源報價"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <input
              type="date"
              className="field"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              aria-label="起日"
            />
            <input
              type="date"
              className="field"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              aria-label="迄日"
            />
            <select
              className="field"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as "all" | OrderStatus);
                setPage(1);
              }}
            >
              <option value="all">全部狀態</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabelZh(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="table-shell table-dense">
            <table>
              <thead>
                <tr>
                  <th>Order_ID</th>
                  <th>訂單日</th>
                  <th>期望</th>
                  <th>承諾</th>
                  <th>客戶</th>
                  <th>來源</th>
                  <th>狀態</th>
                  <th>總額</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((o) => (
                  <tr key={o.Order_ID}>
                    <td>
                      <Link
                        href={`/orders/${o.Order_ID}/`}
                        className="font-mono text-xs text-[var(--brand)] underline"
                      >
                        {o.Order_ID}
                      </Link>
                    </td>
                    <td>{o.Order_Date}</td>
                    <td>{o.Requested_Date}</td>
                    <td className="font-medium text-[var(--brand-deep)]">
                      {o.Promised_Date}
                    </td>
                    <td>
                      {o.Customer_ID} {customerName(o.Customer_ID)}
                    </td>
                    <td className="font-mono text-xs">{o.Quote_ID || "—"}</td>
                    <td>
                      <StatusBadge status={o.Order_Status} />
                    </td>
                    <td className="tabular-nums">
                      NT$ {formatTwd(o.Total_Amount)}
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
