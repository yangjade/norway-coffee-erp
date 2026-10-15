"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-context";
import { roleLabel, roleShortLabel, roleWorkspaceTitle } from "@/lib/roles";

const NAV = [
  { href: "/", label: "首頁" },
  { href: "/customers", label: "客戶" },
  { href: "/products", label: "商品" },
  { href: "/orders", label: "訂單" },
  { href: "/shipping", label: "出貨" },
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
            ? "bg-[linear-gradient(90deg,var(--brand)_0%,var(--brand-mid)_55%,var(--accent-bright)_100%)]"
            : "bg-[linear-gradient(90deg,var(--accent)_0%,var(--accent-bright)_70%,#d4bc8a_100%)]"
        }`}
        aria-hidden
      />

      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-display text-[1.35rem] font-semibold tracking-[0.06em] text-[var(--brand)] sm:text-[1.65rem]">
              挪威的咖啡
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              配銷模組 ERP · 首頁 v1 ·{" "}
              <span className="shell-mark font-medium">
                {roleWorkspaceTitle(currentUser.Role)}
              </span>
            </p>
            <p
              className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] ${
                hydrated ? "text-[var(--brand)]" : "text-[var(--muted)]"
              }`}
              title="同一瀏覽器內各頁共用 Context，並寫入 localStorage"
              aria-live="polite"
            >
              <span
                className={`inline-block h-1.5 w-1.5 ${
                  savedFlash ? "bg-[var(--accent-bright)]" : "bg-[var(--brand)]"
                }`}
              />
              {savedFlash ? "已儲存於本機" : persistLabel}
            </p>
          </div>

          <div
            className={`w-full max-w-md border px-3.5 py-2.5 sm:w-auto ${
              isAdmin
                ? "border-[var(--brand)]/30 bg-[var(--brand-soft)]/55"
                : "border-[var(--accent)]/40 bg-[var(--accent-soft)]/70"
            }`}
          >
            <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
              <span className="sim-dot inline-block h-1.5 w-1.5 bg-[var(--accent)]" />
              <span className="tracking-[0.08em]">教學用權限模擬</span>
              <span className="text-[var(--border)]">·</span>
              <span>非正式登入</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-[var(--brand-deep)]">
                {currentUser.User_ID} {currentUser.User_Name}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isAdmin ? "text-[var(--brand)]" : "text-[#8a6a1f]"
                }`}
              >
                {roleLabel(currentUser.Role)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-[var(--muted)] sm:flex-none">
                <span className="shrink-0">切換身分</span>
                <select
                  className="field min-w-0 flex-1 text-sm sm:w-56"
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
                className="text-xs text-[var(--muted)] underline-offset-2 transition hover:text-[var(--brand)] hover:underline"
              >
                重設樣本
              </button>
            </div>
            {switchMsg && (
              <p className="mt-1.5 text-xs text-[var(--danger)]" role="alert">
                {switchMsg}
              </p>
            )}
          </div>
        </div>

        <nav
          className="mx-auto flex max-w-6xl gap-0.5 overflow-x-auto px-2 pb-0 sm:px-4"
          aria-label="主選單"
        >
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
                className={`nav-link whitespace-nowrap px-3.5 py-2.5 text-sm ${
                  active
                    ? "font-medium text-[var(--brand)]"
                    : "text-[var(--muted)] hover:text-[var(--brand)]"
                } ${
                  isSettings
                    ? "ml-auto border-l border-[var(--border)] pl-4 text-[var(--brand)]"
                    : ""
                }`}
              >
                {item.label}
                {isSettings && (
                  <span className="ml-1.5 text-[10px] font-semibold tracking-wide text-[var(--accent)]">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
          {!isAdmin && (
            <span
              className="ml-auto hidden items-center px-3 py-2.5 text-[11px] text-[var(--muted)] sm:inline-flex"
              title="一般使用者看不到使用者設定"
            >
              使用者設定（無權限）
            </span>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:py-7">{children}</main>
    </div>
  );
}
