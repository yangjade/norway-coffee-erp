"use client";

import Link from "next/link";
import { ActivityTimeline, useRecentActivity } from "@/components/ActivityTimeline";
import { Notice } from "@/components/Notice";
import { StatusBadge } from "@/components/StatusBadge";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { roleLabel, roleWorkspaceTitle } from "@/lib/roles";
import { BASE_DATE } from "@/lib/sample-data";

export default function HomePage() {
  const {
    kpi,
    orders,
    quotations,
    receivables,
    currentUser,
    users,
    customerName,
    persistLabel,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const activity = useRecentActivity(10);

  const pending = [...orders]
    .filter((o) => o.Order_Status === "待確認" || o.Order_Status === "處理中")
    .sort((a, b) => b.Order_Date.localeCompare(a.Order_Date));

  const draftQuotes = quotations.filter((q) => q.Status === "Draft");
  const overdueAr = receivables.filter((r) => {
    if (r.Status === "已結清" || r.Status === "已作廢") return false;
    return r.Invoice_Date < BASE_DATE && r.Paid_Amount < r.Amount;
  });

  const weekAgo = [...orders].filter((o) => {
    const d = o.Order_Date;
    return d < BASE_DATE && d >= "2026-10-06" && o.Order_Status !== "已取消";
  });
  const todayAmt = kpi.todayValidOrderAmount;
  const weekAmt = weekAgo.reduce((s, o) => s + o.Total_Amount, 0);
  const weekAvg = weekAgo.length ? weekAmt / Math.max(weekAgo.length, 1) : 0;
  const amtDelta =
    weekAvg > 0 ? Math.round(((todayAmt - weekAvg) / weekAvg) * 100) : 0;

  const pendingDelta = pending.length - Math.max(1, Math.round(orders.length * 0.15));

  const kpis = [
    {
      label: "客戶數",
      value: String(kpi.customerCount),
      unit: "位",
      delta: `主檔 ${kpi.customerCount} 筆`,
      up: true as boolean | null,
    },
    {
      label: "今日有效訂單",
      value: String(kpi.todayValidOrderCount),
      unit: "筆",
      delta:
        weekAgo.length > 0
          ? `近一週日均約 ${(weekAgo.length / 7).toFixed(1)} 筆`
          : "尚無近一週對照",
      up: kpi.todayValidOrderCount >= weekAgo.length / 7,
    },
    {
      label: "今日有效金額",
      value: formatTwd(kpi.todayValidOrderAmount),
      unit: "元",
      delta:
        weekAvg > 0
          ? `較近一週單筆均額 ${amtDelta >= 0 ? "+" : ""}${amtDelta}%`
          : "尚無均額對照",
      up: amtDelta >= 0,
    },
    {
      label: "待出貨訂單",
      value: String(kpi.pendingShipmentCount),
      unit: "筆",
      delta:
        pendingDelta === 0
          ? "與平常水位接近"
          : pendingDelta > 0
            ? `偏高 ${pendingDelta} 筆`
            : `偏低 ${Math.abs(pendingDelta)} 筆`,
      up: pendingDelta <= 0,
    },
  ];

  const activeStaff = users.filter((u) => u.Role === "Staff" && u.Is_Active).length;
  const inactiveStaff = users.filter((u) => u.Role === "Staff" && !u.Is_Active).length;

  return (
    <div className="space-y-8 sm:space-y-10" data-prod-feel="live-dashboard">
      <section className="animate-rise">
        <div className="brand-rule mb-3.5" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">{roleWorkspaceTitle(currentUser.Role)}</p>
            <h1 className="font-display mt-2.5 text-[2.05rem] tracking-[0.04em] text-[var(--brand-deep)] sm:text-[2.5rem]">
              挪威的咖啡
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              {currentUser.User_Name} · {roleLabel(currentUser.Role)} · 基準日{" "}
              {BASE_DATE}
            </p>
          </div>
          <p className="max-w-sm border-l-2 border-[var(--mist-blue)] pl-4 text-sm leading-relaxed text-[var(--muted)]">
            {isAdmin
              ? "管理者視角：掌握營運指標、待辦與人員設定。"
              : "員工視角：查客戶／商品／訂單，跟催待出貨與應收；不含人員設定。"}
          </p>
        </div>
      </section>

      <section
        className="animate-rise-2 flex flex-wrap gap-2"
        aria-label="待辦捷徑"
      >
        <Link href="/shipping/" className="shortcut-chip">
          待出貨 <strong>{pending.length}</strong>
        </Link>
        <Link href="/receivables/" className="shortcut-chip">
          逾期應收 <strong>{overdueAr.length}</strong>
        </Link>
        <Link href="/quotations/?status=Draft" className="shortcut-chip">
          草稿報價 <strong>{draftQuotes.length}</strong>
        </Link>
        <button
          type="button"
          className="shortcut-chip"
          onClick={() => {
            document
              .querySelector<HTMLButtonElement>('[data-prod-feel="search-trigger"]')
              ?.click();
          }}
        >
          快速搜尋 ⌘K
        </button>
      </section>

      <section
        className="animate-rise-2 kpi-band grid grid-cols-2 lg:grid-cols-4"
        aria-label="四項營運指標"
      >
        {kpis.map((k, i) => (
          <div
            key={k.label}
            data-lead={i === 0 ? "true" : undefined}
            className={`kpi-cell px-4 py-4 sm:px-5 sm:py-5 ${
              i < 2 ? "border-b border-[var(--border-soft)] lg:border-b-0" : ""
            } ${i % 2 === 0 ? "border-r border-[var(--border-soft)]" : ""} ${
              i < 3 ? "lg:border-r lg:border-[var(--border-soft)]" : "lg:border-r-0"
            }`}
          >
            <p className="text-[11px] tracking-[0.06em] text-[var(--muted)]">
              {k.label}
            </p>
            <p className="font-display mt-2 flex items-baseline gap-1.5 text-[1.7rem] tabular-nums text-[var(--brand-deep)] sm:text-[1.9rem]">
              {k.value}
              <span className="text-xs font-normal tracking-normal text-[var(--muted)]">
                {k.unit}
              </span>
            </p>
            <p className="kpi-delta" data-up={k.up ? "true" : "false"}>
              {k.delta}
            </p>
          </div>
        ))}
      </section>

      {isAdmin ? (
        <section className="animate-rise-3 grid gap-5 rounded-[var(--radius)] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(228,235,230,0.55)_0%,rgba(250,248,244,0.95)_100%)] p-5 sm:grid-cols-3 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="font-display text-lg tracking-wide text-[var(--brand-deep)]">
              人員與權限
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
              可查看使用者名單，並停用／重新啟用員工。一般使用者無法進入設定。
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {users.map((u) => (
                <li
                  key={u.User_ID}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-[var(--border-soft)] pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="font-mono text-xs text-[var(--muted)]">
                    {u.User_ID}
                  </span>
                  <span className="font-medium text-[var(--brand-deep)]">
                    {u.User_Name}
                  </span>
                  <span className="text-[var(--muted)]">{roleLabel(u.Role)}</span>
                  <span
                    className={
                      u.Is_Active
                        ? "text-[var(--brand)]"
                        : "text-[var(--danger)]"
                    }
                  >
                    {u.Is_Active ? "啟用" : "停用"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-xs text-[var(--muted)]">
              員工啟用 {activeStaff} · 停用 {inactiveStaff}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-2.5 border-t border-[var(--border)] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <Link href="/settings" className="btn-primary">
              開啟使用者設定
            </Link>
            <Link href="/orders" className="btn-ghost">
              查看全部訂單
            </Link>
            <Link href="/acceptance/" className="btn-ghost">
              課堂驗收區
            </Link>
          </div>
        </section>
      ) : (
        <section className="animate-rise-3 rounded-[var(--radius)] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(217,226,232,0.45)_0%,rgba(250,248,244,0.95)_100%)] p-5 sm:p-6">
          <h2 className="font-display text-lg tracking-wide text-[var(--brand-deep)]">
            今日查詢重點
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            以待出貨與訂單查詢為主；客戶可維護基本資料（信控欄位唯讀）。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { href: "/orders", label: "查訂單", hint: "表頭與明細" },
              { href: "/shipping", label: "出貨揀貨", hint: "待出貨" },
              { href: "/inventory", label: "庫存", hint: "On_Hand" },
              { href: "/receivables", label: "應收", hint: "收款" },
            ].map((q) => (
              <Link key={q.href} href={q.href} className="quick-tile">
                <p className="text-sm font-medium text-[var(--brand-deep)]">
                  {q.label}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">{q.hint}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="animate-rise-4 grid gap-8 lg:grid-cols-[1.15fr_0.95fr] lg:gap-10">
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2.5">
            <h2 className="font-display text-base tracking-wide text-[var(--brand-deep)]">
              {isAdmin ? "待出貨清單" : "待出貨（優先處理）"}
            </h2>
            <Link
              href="/shipping/"
              className="text-xs text-[var(--brand)] underline-offset-4 transition hover:underline"
            >
              前往出貨
            </Link>
          </div>
          {pending.length === 0 ? (
            <Notice kind="empty">目前沒有符合條件的訂單</Notice>
          ) : (
            <ul>
              {pending.slice(0, 8).map((o) => (
                <li
                  key={o.Order_ID}
                  className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-3 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${o.Order_ID}`}
                      className="font-medium text-[var(--brand)] underline-offset-4 hover:underline"
                    >
                      {o.Order_ID}
                    </Link>
                    <p className="truncate text-xs leading-relaxed text-[var(--muted)]">
                      {o.Order_Date} · {customerName(o.Customer_ID)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={o.Order_Status} />
                    <p className="mt-1.5 text-xs tabular-nums text-[var(--muted)]">
                      NT$ {formatTwd(o.Total_Amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ActivityTimeline items={activity} />
      </section>

      <section className="border-t border-[var(--border)] pt-6 text-sm leading-relaxed text-[var(--muted)]">
        <p className="font-medium text-[var(--brand-deep)]">資料說明</p>
        <p className="mt-1.5 text-xs sm:text-sm">
          {persistLabel}（本機共用資料）· 基準日 {BASE_DATE} · 金額為新臺幣（不含稅運退）
        </p>
        <p className="mt-1.5 text-xs sm:text-sm">
          建議流程：已接受報價 → 轉訂單 → 出貨揀貨確認 → 扣庫並產生應收 → 登記收款。
        </p>
      </section>
    </div>
  );
}
