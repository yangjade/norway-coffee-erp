"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { PaginationBar } from "@/components/PaginationBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ToastProvider";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/list-utils";
import { isLateDelivery, ORDER_STATUSES, statusLabelZh } from "@/lib/order-rules";
import type { OrderStatus } from "@/lib/types";

export default function OrdersPage() {
  const {
    orders,
    customers,
    currentUser,
    customerName,
    simLoadError,
    exportDemoJson,
    importDemoJson,
  } = useApp();
  const { pushToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [customerId, setCustomerId] = useState("all");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const customerOptions = useMemo(
    () =>
      [...customers].sort((a, b) =>
        a.Customer_ID.localeCompare(b.Customer_ID),
      ),
    [customers],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...orders]
      .filter((o) => {
        if (status !== "all" && o.Order_Status !== status) return false;
        if (customerId !== "all" && o.Customer_ID !== customerId) return false;
        if (dateFrom && o.Order_Date < dateFrom) return false;
        if (dateTo && o.Order_Date > dateTo) return false;
        if (!needle) return true;
        return (
          o.Order_ID.toLowerCase().includes(needle) ||
          (o.Quote_ID || "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.Order_Date.localeCompare(a.Order_Date));
  }, [orders, q, status, customerId, dateFrom, dateTo]);

  const { pageRows, page: safePage, pageCount, total } = paginate(
    filtered,
    page,
    DEFAULT_PAGE_SIZE,
  );

  function clearFilters() {
    setQ("");
    setCustomerId("all");
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function onExport() {
    const json = exportDemoJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `norway-coffee-erp-demo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ tone: "success", message: "已匯出 JSON（含訂單／報價／庫存）" });
  }

  function onImportFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const r = importDemoJson(raw);
      pushToast({
        tone: r.ok ? "success" : "error",
        message: r.message,
      });
    };
    reader.readAsText(file);
  }

  return (
    <div
      className="space-y-5 animate-rise"
      data-week8="orders-list"
      data-week8-marker="week8-official-20261118"
    >
      <PageHeader
        title="銷售訂單"
        description="Sales Order · 草稿 → 已確認 → 已取消 · 雙交期 · 確認不扣庫"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={onExport}>
              匯出 JSON
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => fileRef.current?.click()}
            >
              匯入 JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                onImportFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <Link href="/quote-to-order/" className="btn-primary text-sm">
              前往報價轉單
            </Link>
          </div>
        }
      />

      <div
        className="rounded-[var(--radius)] border border-[var(--wood)]/35 bg-[var(--accent-soft)]/70 px-5 py-4 text-sm leading-relaxed text-[var(--brand-deep)]"
        role="note"
      >
        <p className="font-medium">課堂提示</p>
        <p className="mt-1.5 text-[var(--ink)]/85">
          資料存在瀏覽器 localStorage；清快取會不見，請用「匯出／匯入
          JSON」備份。確認訂單只保留交期與金額快照，不扣庫存（W10）、不產出貨單（W11）、不建應收（W12）。
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          建議主流程：報價接受 → 前往報價轉單 → 調交期／改期同意 → 確認 →（之後才出貨）。身分：
          {currentUser.User_Name}（{currentUser.Role}）
        </p>
      </div>

      {simLoadError ? (
        <Notice kind="error" title="載入失敗">
          請至驗收區重設樣本，或匯入先前匯出的 JSON。
        </Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-[var(--muted)]">
              總計 <span className="font-medium text-[var(--ink)]">{total}</span> 筆
              {filtered.length !== orders.length
                ? `（篩選自 ${orders.length}）`
                : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/quotations/" className="btn-ghost text-xs">
                報價列表
              </Link>
              <Link href="/acceptance/" className="btn-ghost text-xs">
                S01–S13 驗收
              </Link>
            </div>
          </div>

          <div className="filter-bar panel !items-end gap-3 px-4 py-3">
            <label className="block min-w-[10rem] flex-1 space-y-1">
              <span className="text-[11px] text-[var(--muted)]">訂單編號或來源報價</span>
              <input
                className="field w-full"
                placeholder="例 SO-… 或 QT-…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--muted)]">客戶</span>
              <select
                className="field min-w-[9rem]"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">全部客戶</option>
                {customerOptions.map((c) => (
                  <option key={c.Customer_ID} value={c.Customer_ID}>
                    {c.Customer_ID}｜{c.Customer_Name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--muted)]">訂單日期起</span>
              <input
                type="date"
                className="field"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--muted)]">迄</span>
              <input
                type="date"
                className="field"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-[var(--muted)]">狀態</span>
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
                    {statusLabelZh(s)}（{s}）
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-ghost text-xs" onClick={clearFilters}>
              清除條件
            </button>
          </div>

          <div className="table-shell table-dense">
            <table>
              <thead>
                <tr>
                  <th>訂單編號</th>
                  <th>客戶</th>
                  <th>來源報價</th>
                  <th>訂單日期</th>
                  <th>期望／承諾交貨日</th>
                  <th>狀態</th>
                  <th>含稅總額</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[var(--muted)]">
                      沒有符合條件的訂單。可「清除條件」或「前往報價轉單」。
                    </td>
                  </tr>
                ) : (
                  pageRows.map((o) => {
                    const late = isLateDelivery(o);
                    return (
                      <tr key={o.Order_ID}>
                        <td>
                          <Link
                            href={`/orders/${o.Order_ID}/`}
                            className="font-mono text-xs text-[var(--brand)] underline"
                          >
                            {o.Order_ID}
                          </Link>
                        </td>
                        <td>
                          {o.Customer_ID}｜{customerName(o.Customer_ID)}
                        </td>
                        <td>
                          {o.Quote_ID ? (
                            <Link
                              href={`/quotations/${o.Quote_ID}/`}
                              className="font-mono text-xs text-[var(--brand)] underline"
                            >
                              {o.Quote_ID}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="tabular-nums">{o.Order_Date}</td>
                        <td className="tabular-nums">
                          <span>{o.Requested_Date}</span>
                          <span className="text-[var(--muted)]"> / </span>
                          <span
                            className={
                              late
                                ? "font-semibold text-[var(--danger)]"
                                : "font-medium text-[var(--brand-deep)]"
                            }
                            title={late ? "承諾晚於期望" : undefined}
                          >
                            {o.Promised_Date}
                          </span>
                          {late && (
                            <span className="ml-1 text-[10px] font-medium text-[var(--danger)]">
                              晚交
                            </span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={o.Order_Status} />
                        </td>
                        <td className="tabular-nums">
                          NT$ {formatTwd(o.Total_Amount)}
                        </td>
                        <td>
                          <Link
                            href={`/orders/${o.Order_ID}/`}
                            className="btn-ghost px-2 py-1 text-xs"
                          >
                            查看
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
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
