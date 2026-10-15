"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { BASE_DATE } from "@/lib/sample-data";
import { formatTwd } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { Notice } from "@/components/Notice";
import { ClassroomSim } from "@/components/ClassroomSim";
import { roleLabel, roleWorkspaceTitle } from "@/lib/roles";

export default function HomePage() {
  const { kpi, orders, currentUser, users, customerName, persistLabel } =
    useApp();
  const isAdmin = currentUser.Role === "Admin";

  const pending = [...orders]
    .filter((o) => o.Order_Status === "待確認" || o.Order_Status === "處理中")
    .sort((a, b) => b.Order_Date.localeCompare(a.Order_Date));

  const recent = [...orders]
    .sort((a, b) => {
      const d = b.Order_Date.localeCompare(a.Order_Date);
      return d !== 0 ? d : b.Order_ID.localeCompare(a.Order_ID);
    })
    .slice(0, 5);

  const kpis = [
    { label: "客戶數", value: String(kpi.customerCount), unit: "位" },
    { label: "今日有效訂單", value: String(kpi.todayValidOrderCount), unit: "筆" },
    {
      label: "今日有效金額",
      value: formatTwd(kpi.todayValidOrderAmount),
      unit: "元",
    },
    { label: "待出貨訂單", value: String(kpi.pendingShipmentCount), unit: "筆" },
  ];

  const activeStaff = users.filter((u) => u.Role === "Staff" && u.Is_Active).length;
  const inactiveStaff = users.filter((u) => u.Role === "Staff" && !u.Is_Active).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="animate-rise">
        <div className="brand-rule mb-3" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className={`eyebrow ${
                isAdmin ? "text-[var(--brand)]" : "text-[#8a6a1f]"
              }`}
            >
              {roleWorkspaceTitle(currentUser.Role)}
            </p>
            <h1 className="font-display mt-1.5 text-[1.85rem] font-semibold tracking-[0.04em] text-[var(--brand)] sm:text-[2.35rem]">
              挪威的咖啡
            </h1>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              {currentUser.User_Name} · {roleLabel(currentUser.Role)} · 基準日{" "}
              {BASE_DATE}
            </p>
          </div>
          <p className="max-w-xs border-l-2 border-[var(--accent-bright)]/70 pl-3 text-xs leading-relaxed text-[var(--muted)]">
            {isAdmin
              ? "管理者視角：監看營運 KPI、人員啟用狀態與模組入口。"
              : "員工視角：查客戶／商品／訂單，處理待出貨跟催；不含人員設定。"}
          </p>
        </div>
      </section>

      <section
        className={`animate-rise-2 kpi-band grid grid-cols-2 lg:grid-cols-4 ${
          isAdmin ? "border-[var(--brand)]/35" : "border-[var(--border)]"
        }`}
        aria-label="四項營運指標"
      >
        {kpis.map((k, i) => (
          <div
            key={k.label}
            data-lead={i === 0 ? "true" : undefined}
            className={`kpi-cell px-3.5 py-3.5 sm:px-5 sm:py-4 ${
              i < 2 ? "border-b border-[var(--border-soft)] lg:border-b-0" : ""
            } ${i % 2 === 0 ? "border-r border-[var(--border-soft)]" : ""} ${
              i < 3 ? "lg:border-r lg:border-[var(--border-soft)]" : "lg:border-r-0"
            }`}
          >
            <p className="text-[11px] tracking-[0.06em] text-[var(--muted)]">
              {k.label}
            </p>
            <p className="font-display mt-1.5 flex items-baseline gap-1 text-[1.65rem] font-semibold tabular-nums text-[var(--brand)] sm:text-[1.85rem]">
              {k.value}
              <span className="text-xs font-normal tracking-normal text-[var(--muted)]">
                {k.unit}
              </span>
            </p>
          </div>
        ))}
      </section>

      {isAdmin ? (
        <section className="animate-rise-3 grid gap-4 border border-[var(--brand)]/25 bg-[linear-gradient(135deg,rgba(228,235,228,0.55)_0%,rgba(255,252,246,0.9)_100%)] p-4 sm:grid-cols-3 sm:p-5">
          <div className="sm:col-span-2">
            <h2 className="font-display text-base font-semibold tracking-wide text-[var(--brand-deep)]">
              人員與權限
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              可查看使用者名單，並停用／重新啟用員工（U002）。一般使用者無法進入此區。
            </p>
            <ul className="mt-3.5 space-y-2 text-sm">
              {users.map((u) => (
                <li
                  key={u.User_ID}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-[var(--border-soft)] pb-2 last:border-0 last:pb-0"
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
            <p className="mt-3 text-xs text-[var(--muted)]">
              員工啟用 {activeStaff} · 停用 {inactiveStaff}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-2 border-t border-[var(--border)] pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <Link href="/settings" className="btn-primary">
              開啟使用者設定
            </Link>
            <Link href="/orders" className="btn-ghost">
              查看全部訂單
            </Link>
          </div>
        </section>
      ) : (
        <section className="animate-rise-3 border border-[var(--accent)]/40 bg-[linear-gradient(135deg,rgba(240,230,207,0.55)_0%,rgba(255,252,246,0.92)_100%)] p-4 sm:p-5">
          <h2 className="font-display text-base font-semibold tracking-wide text-[var(--brand-deep)]">
            今日查詢重點
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            以待出貨與訂單查詢為主；客戶／商品僅供唯讀查閱。
          </p>
          <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { href: "/orders", label: "查訂單", hint: "表頭＋明細" },
              { href: "/customers", label: "查客戶", hint: "C001–C005" },
              { href: "/products", label: "查商品", hint: "咖啡樣本" },
              { href: "/shipping", label: "出貨（預留）", hint: "第 11 週" },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[var(--accent-bright)] hover:bg-[var(--paper)]"
              >
                <p className="text-sm font-medium text-[var(--brand)]">
                  {q.label}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">{q.hint}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section
        className={`animate-rise-4 grid gap-6 lg:gap-10 ${
          isAdmin ? "lg:grid-cols-2" : "lg:grid-cols-[1.25fr_1fr]"
        }`}
      >
        <div className={!isAdmin ? "order-1" : undefined}>
          <div className="mb-2.5 flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2">
            <h2 className="font-display text-[0.95rem] font-semibold tracking-wide text-[var(--brand-deep)]">
              {isAdmin ? "待出貨清單" : "待出貨（優先處理）"}
            </h2>
            <Link
              href="/orders"
              className="text-xs text-[var(--brand)] underline-offset-2 transition hover:underline"
            >
              查看訂單
            </Link>
          </div>
          {pending.length === 0 ? (
            <Notice kind="empty">目前沒有符合條件的訂單</Notice>
          ) : (
            <ul>
              {pending.map((o) => (
                <li
                  key={o.Order_ID}
                  className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-2.5 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${o.Order_ID}`}
                      className="font-medium text-[var(--brand)] underline-offset-2 hover:underline"
                    >
                      {o.Order_ID}
                    </Link>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {o.Order_Date} · {customerName(o.Customer_ID)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={o.Order_Status} />
                    <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">
                      NT$ {formatTwd(o.Total_Amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={!isAdmin ? "order-2" : undefined}>
          <div className="mb-2.5 flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2">
            <h2 className="font-display text-[0.95rem] font-semibold tracking-wide text-[var(--brand-deep)]">
              最近五張訂單
            </h2>
            <Link
              href="/orders"
              className="text-xs text-[var(--brand)] underline-offset-2 transition hover:underline"
            >
              全部訂單
            </Link>
          </div>
          {recent.length === 0 ? (
            <Notice kind="empty">目前沒有符合條件的訂單</Notice>
          ) : (
            <ul>
              {recent.map((o) => (
                <li
                  key={o.Order_ID}
                  className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-2.5 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${o.Order_ID}`}
                      className="font-medium text-[var(--brand)] underline-offset-2 hover:underline"
                    >
                      {o.Order_ID}
                    </Link>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {o.Order_Date} · {customerName(o.Customer_ID)}
                    </p>
                  </div>
                  <StatusBadge status={o.Order_Status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ClassroomSim />

      <section className="border-t border-[var(--border)] pt-5 text-xs leading-relaxed text-[var(--muted)]">
        <p className="font-medium text-[var(--brand-deep)]">資料說明</p>
        <p className="mt-1">
          {persistLabel}（Context 單一來源 + localStorage；「重設樣本」清回初始）·
          基準日 {BASE_DATE}（Asia/Taipei）· 金額新臺幣不含稅運退 · 出貨預留第 11
          週 · 版本首頁 v1
        </p>
        <p className="mt-1">
          教學驗證：訂單列表將 SO002 改為「已取消」→ 今日有效訂單／金額／待出貨立刻重算。
        </p>
      </section>
    </div>
  );
}
