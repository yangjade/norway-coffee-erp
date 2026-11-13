"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/list-utils";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["待確認", "處理中", "已出貨", "已取消"];
type SortKey = "date-desc" | "date-asc" | "amount-desc" | "id-asc";

export default function OrdersPage() {
  const { orders, setOrderStatus, currentUser, customerName, simLoadError } =
    useApp();
  const { pushToast } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = [...orders].filter((o) => {
      if (status !== "all" && o.Order_Status !== status) return false;
      if (!needle) return true;
      const name = customerName(o.Customer_ID).toLowerCase();
      return (
        o.Order_ID.toLowerCase().includes(needle) ||
        o.Customer_ID.toLowerCase().includes(needle) ||
        name.includes(needle) ||
        (o.Quote_ID || "").toLowerCase().includes(needle)
      );
    });
    rows.sort((a, b) => {
      if (sort === "date-asc") return a.Order_Date.localeCompare(b.Order_Date);
      if (sort === "amount-desc") return b.Total_Amount - a.Total_Amount;
      if (sort === "id-asc") return a.Order_ID.localeCompare(b.Order_ID);
      const d = b.Order_Date.localeCompare(a.Order_Date);
      return d !== 0 ? d : b.Order_ID.localeCompare(a.Order_ID);
    });
    return rows;
  }, [orders, q, status, sort, customerName]);

  const { pageRows, page: safePage, pageCount, total } = paginate(
    filtered,
    page,
    DEFAULT_PAGE_SIZE,
  );

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="訂單"
        description="搜尋、篩選、排序與分頁；點選 Order_ID 進入工作區。改為已出貨會扣庫並產生應收。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/quote-to-order/"
              className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
            >
              報價轉訂單
            </Link>
          </div>
        }
      />

      <Notice kind="info">
        變更訂單狀態後，首頁 KPI、庫存、應收會同步。目前身分：
        {currentUser.User_Name}。庫存不足時無法出貨。
      </Notice>

      {simLoadError ? (
        <Notice kind="error" title="載入失敗，請重試">
          此為模擬測試「載入失敗」狀態。請至驗收區恢復樣本。
        </Notice>
      ) : null}

      {!simLoadError && (
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
              aria-label="搜尋訂單"
            />
            <select
              className="field"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as "all" | OrderStatus);
                setPage(1);
              }}
              aria-label="狀態篩選"
            >
              <option value="all">全部狀態</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              className="field"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="排序"
            >
              <option value="date-desc">日期新→舊</option>
              <option value="date-asc">日期舊→新</option>
              <option value="amount-desc">金額高→低</option>
              <option value="id-asc">編號舊→新</option>
            </select>
          </div>

          <p className="text-xs text-[var(--muted)]">
            篩選後 {filtered.length}／共 {orders.length} 筆
          </p>

          {orders.length === 0 ? (
            <Notice kind="empty" title="尚無訂單">
              可從已接受報價轉單，或至驗收區載入樣本。
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/quote-to-order/" className="btn-primary">
                  報價轉訂單
                </Link>
                <Link href="/acceptance/" className="btn-ghost">
                  驗收區
                </Link>
              </div>
            </Notice>
          ) : filtered.length === 0 ? (
            <Notice kind="empty" title="沒有符合條件的訂單">
              請調整搜尋或狀態篩選。
            </Notice>
          ) : (
            <>
              <div className="table-shell table-dense">
                <table>
                  <thead>
                    <tr>
                      <th>Order_ID</th>
                      <th>日期</th>
                      <th>客戶</th>
                      <th>來源報價</th>
                      <th>狀態</th>
                      <th>金額</th>
                      <th>調整狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((o) => (
                      <tr key={o.Order_ID}>
                        <td>
                          <Link
                            href={`/orders/${o.Order_ID}`}
                            className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                          >
                            {o.Order_ID}
                          </Link>
                        </td>
                        <td>{o.Order_Date}</td>
                        <td>
                          {o.Customer_ID} {customerName(o.Customer_ID)}
                        </td>
                        <td>
                          {o.Quote_ID ? (
                            <Link
                              href={`/quotations/${o.Quote_ID}/`}
                              className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                            >
                              {o.Quote_ID}
                            </Link>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={o.Order_Status} />
                        </td>
                        <td className="tabular-nums">
                          NT$ {formatTwd(o.Total_Amount)}
                        </td>
                        <td>
                          <select
                            className="field text-xs"
                            value={o.Order_Status}
                            aria-label={`調整 ${o.Order_ID} 狀態`}
                            onChange={(e) => {
                              const next = e.target.value as OrderStatus;
                              const result = setOrderStatus(o.Order_ID, next);
                              if (result.ok) {
                                pushToast({
                                  tone: "success",
                                  message: result.message ?? `已更新 ${o.Order_ID}`,
                                });
                              } else {
                                pushToast({
                                  tone: "error",
                                  title: "狀態更新失敗",
                                  message: result.message ?? "失敗",
                                });
                              }
                            }}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
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
        </>
      )}
    </div>
  );
}
