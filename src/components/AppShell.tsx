"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  CommandPalette,
  useCommandPaletteHotkey,
} from "@/components/CommandPalette";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApp } from "@/lib/app-context";
import { isNavActive, NAV_GROUPS } from "@/lib/nav";
import { roleLabel, roleShortLabel, roleWorkspaceTitle } from "@/lib/roles";

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
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const prevSaved = useRef<number | null>(null);
  const isAdmin = currentUser.Role === "Admin";

  useCommandPaletteHotkey(setCmdOpen);

  useEffect(() => {
    setSideOpen(false);
  }, [pathname]);

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

  const openSearch = useCallback(() => setCmdOpen(true), []);

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
      className={`erp-root min-h-screen ${isAdmin ? "role-admin" : "role-staff"}`}
      data-role={currentUser.Role}
      data-prod-feel="erp-chrome-v1"
    >
      <div
        className={`role-band h-1 w-full ${
          isAdmin
            ? "bg-[linear-gradient(90deg,var(--mist-blue)_0%,var(--brand-soft)_45%,var(--milk-tea)_100%)]"
            : "bg-[linear-gradient(90deg,var(--accent-soft)_0%,var(--mist-blue)_55%,var(--brand-soft)_100%)]"
        }`}
        aria-hidden
      />

      <div className="erp-frame">
        {/* Sidebar */}
        <aside
          className={`erp-sidebar no-print ${sideOpen ? "is-open" : ""}`}
          aria-label="模組導覽"
        >
          <div className="px-4 pb-3 pt-5">
            <p className="brand-wordmark text-[1.35rem] leading-tight">
              挪威的咖啡
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--muted)]">
              配銷 ERP · 本機示範
            </p>
          </div>

          <nav className="side-nav px-2 pb-6">
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter(
                (item) => !item.adminOnly || isAdmin,
              );
              if (items.length === 0) {
                if (group.id === "system" && !isAdmin) {
                  return (
                    <div key={group.id} className="side-group">
                      <p className="side-group-label">{group.label}</p>
                      <Link
                        href="/acceptance/"
                        data-active={isNavActive(pathname, "/acceptance")}
                        className="side-link"
                      >
                        驗收區
                      </Link>
                      <span
                        className="side-link-disabled"
                        title="一般使用者看不到使用者設定"
                      >
                        設定（無權限）
                      </span>
                    </div>
                  );
                }
                return null;
              }
              return (
                <div key={group.id} className="side-group">
                  <p className="side-group-label">{group.label}</p>
                  {items.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href === "/" ? "/" : `${item.href}/`}
                        data-active={active}
                        className="side-link"
                      >
                        {item.label}
                        {item.adminOnly && (
                          <span className="ml-auto text-[10px] text-[var(--sage)]">
                            管理者
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </aside>

        {sideOpen && (
          <button
            type="button"
            className="sidebar-scrim no-print lg:hidden"
            aria-label="關閉選單"
            onClick={() => setSideOpen(false)}
          />
        )}

        <div className="erp-main-col">
          <header className="app-header sticky top-0 z-30">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <button
                type="button"
                className="btn-ghost px-2.5 py-1.5 text-xs lg:hidden"
                aria-label="開啟選單"
                onClick={() => setSideOpen(true)}
              >
                選單
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                  <span className="shell-mark font-medium">
                    {roleWorkspaceTitle(currentUser.Role)}
                  </span>
                  <span className="text-[var(--border)]">·</span>
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

              <button
                type="button"
                className="search-trigger"
                onClick={openSearch}
                data-prod-feel="search-trigger"
                aria-label="開啟快速搜尋"
              >
                <span className="hidden sm:inline">搜尋客戶／報價／訂單…</span>
                <span className="sm:hidden">搜尋</span>
                <kbd className="kbd ml-2 hidden sm:inline-flex">⌘K</kbd>
              </button>

              <div className="role-chip hidden items-center gap-2 px-3 py-2 md:flex">
                <span className="text-xs font-medium text-[var(--brand-deep)]">
                  {currentUser.User_Name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isAdmin
                      ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
                      : "bg-[var(--accent-soft)] text-[var(--wood)]"
                  }`}
                >
                  {roleLabel(currentUser.Role)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-soft)] px-4 py-2 sm:px-5">
              <label className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="shrink-0">身分</span>
                <select
                  className="field min-w-0 py-1 text-xs sm:w-48"
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
                onClick={() => setResetOpen(true)}
                className="text-xs text-[var(--muted)] underline-offset-4 transition hover:text-[var(--brand)] hover:underline"
              >
                重設樣本
              </button>
              {switchMsg && (
                <p className="text-xs text-[var(--danger)]" role="alert">
                  {switchMsg}
                </p>
              )}
              <span className="ml-auto hidden text-[11px] text-[var(--muted)] sm:inline">
                非正式登入 · 教學權限模擬
              </span>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-5">
            <Breadcrumbs />
          </div>

          <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-5 sm:py-7">
            {children}
          </main>

          <footer className="mx-auto max-w-6xl px-4 pb-8 pt-2 text-xs text-[var(--muted)] sm:px-5 no-print">
            <p>
              挪威的咖啡配銷 ERP · 建議流程：報價 → 轉訂單 → 出貨 → 庫存／應收 →
              收款。課堂驗收請至{" "}
              <Link
                href="/acceptance/"
                className="text-[var(--brand)] underline-offset-2 hover:underline"
              >
                驗收區
              </Link>
              。
            </p>
            <p className="mt-1 opacity-70" data-prod-feel-marker="prod-feel-20261113">
              prod-feel-20261113
            </p>
          </footer>
        </div>
      </div>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <ConfirmDialog
        open={resetOpen}
        title="重設樣本資料？"
        message="會清除本機已修改資料，還原為較完整的示範資料量（含足夠列表分頁列數）。此操作無法復原。"
        confirmLabel="重設樣本"
        danger
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemoData();
          setSwitchMsg(null);
          setResetOpen(false);
        }}
      />
    </div>
  );
}
