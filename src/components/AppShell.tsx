"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClassroomSim } from "@/components/ClassroomSim";
import { useApp } from "@/lib/app-context";
import { roleLabel, roleShortLabel, roleWorkspaceTitle } from "@/lib/roles";

const NAV = [
  { href: "/", label: "首頁" },
  { href: "/customers", label: "客戶" },
  { href: "/products", label: "商品" },
  { href: "/quotations", label: "報價" },
  { href: "/orders", label: "訂單" },
  { href: "/quote-to-order", label: "報價轉訂單" },
  { href: "/inventory", label: "庫存" },
  { href: "/shipping", label: "出貨" },
  { href: "/receivables", label: "應收" },
  { href: "/settings", label: "使用者設定", adminOnly: true },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    currentUser,
    users,
    switchUser,
    resetDemoData,
    persistLabel,
    hydrated,
    lastSavedAt,
  } = useApp();
  const [switchMsg, setSwitchMsg] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const prevSaved = useRef<number | null>(null);
  const isAdmin = currentUser.Role === "Admin";

  useEffect(() => {
    if (!hydrated || lastSavedAt == null) return;
    if (prevSaved.current != null && prevSaved.current !== lastSavedAt) {
      setSavedFlash(true);
      const t = window.setTimeout(() => setSavedFlash(false), 1600);
      prevSaved.current = lastSavedAt;
      return () => window.clearTimeout(t);
    }
    prevSaved.current = lastSavedAt;
  }, [hydrated, lastSavedAt]);

  const visibleNav = NAV.filter(
    (item) => !("adminOnly" in item && item.adminOnly) || isAdmin,
  );

  function handleSwitch(userId: string) {
    const result = switchUser(userId);
    if (!result.ok) {
      setSwitchMsg(result.message ?? "切換失敗");
      return;
    }
    setSwitchMsg(null);
  }

  return (
    <div
      className={`min-h-screen ${isAdmin ? "role-admin" : "role-staff"}`}
      data-role={currentUser.Role}
    >
      <div
        className={`role-band h-1.5 w-full ${
          isAdmin
            ? "bg-[linear-gradient(90deg,var(--mist-blue)_0%,var(--brand-soft)_45%,var(--milk-tea)_100%)]"
            : "bg-[linear-gradient(90deg,var(--accent-soft)_0%,var(--mist-blue)_55%,var(--brand-soft)_100%)]"
        }`}
        aria-hidden
      />

      <header className="app-header sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-3.5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 animate-rise">
            <p className="brand-wordmark text-[1.55rem] sm:text-[1.85rem]">
              挪威的咖啡
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-[var(--muted)]">
              <span className="shell-mark font-medium">
                {roleWorkspaceTitle(currentUser.Role)}
              </span>
              <span className="text-[var(--border)]">·</span>
              <span>配銷 ERP · 報價到出貨到應收</span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  hydrated ? "text-[var(--brand)]" : ""
                }`}
                title="同一瀏覽器內各頁共用資料，並寫入本機儲存"
                aria-live="polite"
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    savedFlash
                      ? "bg-[var(--accent-bright)]"
                      : "bg-[var(--brand-mid)]"
                  }`}
                />
                {savedFlash ? "已儲存" : persistLabel}
              </span>
            </div>
          </div>

          <div className="role-chip w-full max-w-md px-4 py-3 sm:w-auto">
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <span className="sim-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--sage)]" />
              <span className="tracking-[0.06em]">教學用權限模擬</span>
              <span className="text-[var(--border)]">·</span>
              <span>非正式登入</span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-[var(--brand-deep)]">
                {currentUser.User_ID} {currentUser.User_Name}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  isAdmin
                    ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                    : "bg-[var(--accent-soft)] text-[var(--wood)]"
                }`}
              >
                {roleLabel(currentUser.Role)}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-[var(--muted)] sm:flex-none">
                <span className="shrink-0">切換身分</span>
                <select
                  className="field min-w-0 flex-1 text-sm sm:w-52"
                  value={currentUser.User_ID}
                  onChange={(e) => handleSwitch(e.target.value)}
                  aria-label="切換模擬使用者"
                >
                  {users.map((u) => (
                    <option
                      key={u.User_ID}
                      value={u.User_ID}
                      disabled={!u.Is_Active}
                    >
                      {u.User_ID} {u.User_Name}｜{roleShortLabel(u.Role)}
                      {!u.Is_Active ? "（已停用）" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "重設樣本會清除本機已修改資料，還原為初始樣本。確定？",
                    )
                  ) {
                    resetDemoData();
                    setSwitchMsg(null);
                  }
                }}
                className="text-xs text-[var(--muted)] underline-offset-4 transition hover:text-[var(--brand)] hover:underline"
              >
                重設樣本
              </button>
            </div>
            {switchMsg && (
              <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
                {switchMsg}
              </p>
            )}
          </div>
        </div>

        <nav className="nav-rail" aria-label="主選單">
          {visibleNav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const isSettings = item.href === "/settings";
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active}
                className={`nav-link whitespace-nowrap px-3.5 py-2 text-sm ${
                  active
                    ? "text-[var(--brand-deep)]"
                    : "text-[var(--muted)]"
                } ${isSettings ? "ml-auto" : ""}`}
              >
                {item.label}
                {isSettings && (
                  <span className="ml-1.5 text-[10px] font-medium tracking-wide text-[var(--sage)]">
                    管理者
                  </span>
                )}
              </Link>
            );
          })}
          {!isAdmin && (
            <span
              className="ml-auto hidden items-center px-3 py-2 text-[11px] text-[var(--muted)] sm:inline-flex"
              title="一般使用者看不到使用者設定"
            >
              設定（無權限）
            </span>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:py-10">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-2 sm:pb-12">
        <ClassroomSim />
      </footer>
    </div>
  );
}
