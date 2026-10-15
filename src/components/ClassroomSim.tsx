"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";

const ACTIONS: {
  key: string;
  label: string;
  hint: string;
  tone: "brand" | "accent" | "danger" | "neutral";
}[] = [
  { key: "cancel", label: "取消 SO002", hint: "KPI 應變 2／7,200／待出貨 2", tone: "brand" },
  { key: "clear", label: "清空訂單", hint: "客戶仍 5，訂單指標歸零", tone: "neutral" },
  { key: "fail", label: "載入失敗", hint: "與無資料／無權限分開顯示", tone: "danger" },
  { key: "reset", label: "恢復原始樣本", hint: "清回初始並寫入本機", tone: "accent" },
  { key: "settings", label: "直接進入設定", hint: "Staff 應被擋、Admin 可進", tone: "brand" },
  { key: "toggle", label: "呼叫啟用修改", hint: "切換 U002 啟用（測第三層）", tone: "accent" },
];

export function ClassroomSim() {
  const router = useRouter();
  const {
    setOrderStatus,
    clearOrders,
    resetDemoData,
    setSimLoadError,
    setUserActive,
    users,
    currentUser,
  } = useApp();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function flash(key: string, text: string) {
    setBusy(key);
    setMsg(text);
    window.setTimeout(() => setBusy(null), 450);
  }

  function onAction(key: string) {
    switch (key) {
      case "cancel":
        setSimLoadError(false);
        setOrderStatus("SO002", "已取消");
        flash(key, "已取消 SO002 → 請回首頁看 KPI（應為 2 筆／7,200 元／待出貨 2）");
        break;
      case "clear":
        setSimLoadError(false);
        clearOrders();
        flash(key, "已清空訂單 → 首頁訂單指標應為 0，並顯示無訂單");
        break;
      case "fail":
        setSimLoadError(true);
        flash(key, "已模擬載入失敗（訂單區改顯示錯誤狀態）");
        break;
      case "reset":
        resetDemoData();
        flash(key, "已恢復原始樣本，並同步寫入本機");
        break;
      case "settings":
        flash(key, "導向設定頁（Staff＝無權限；Admin＝可進）");
        router.push("/settings");
        break;
      case "toggle": {
        const u002 = users.find((u) => u.User_ID === "U002");
        const next = !(u002?.Is_Active ?? true);
        const result = setUserActive("U002", next);
        flash(
          key,
          result.ok
            ? `已修改 U002 → ${next ? "啟用" : "停用"}（目前：${currentUser.User_Name}／${currentUser.Role === "Admin" ? "管理者" : "員工"}）`
            : `已阻擋：${result.message}`,
        );
        break;
      }
    }
  }

  return (
    <section className="animate-rise-4 overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
      <div className="relative border-b border-[var(--border)] bg-[var(--brand)] px-4 py-4 text-[var(--surface)] sm:px-5">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,transparent,var(--accent-bright),transparent)]"
          aria-hidden
        />
        <p className="eyebrow text-[rgba(240,230,207,0.85)]">
          Norway Coffee · Classroom Lab
        </p>
        <h2 className="font-display mt-1.5 text-lg font-semibold tracking-wide sm:text-xl">
          課堂驗收工具與資料缺口
        </h2>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-white/78">
          挪威的咖啡教學模擬：按鈕會真正改資料並同步首頁 KPI／訂單列表（本機
          localStorage）。非正式登入，不能當正式資安證據。
        </p>
      </div>

      <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            data-busy={busy === a.key ? "true" : undefined}
            onClick={() => onAction(a.key)}
            className={`btn-sim ${
              a.tone === "brand"
                ? "border-[var(--brand)]/20 bg-[var(--brand-soft)]/40 hover:border-[var(--brand)]/45"
                : a.tone === "accent"
                  ? "border-[var(--accent)]/30 bg-[var(--accent-soft)]/45 hover:border-[var(--accent)]"
                  : a.tone === "danger"
                    ? "border-[var(--danger-border)] bg-[var(--danger-bg)] hover:border-[var(--danger)]/45"
                    : "border-[var(--border)] bg-[var(--linen)]/50 hover:border-[var(--brand)]/35"
            }`}
          >
            <span className="text-[11px] tracking-[0.08em] text-[var(--muted)]">
              模擬測試
            </span>
            <span className="mt-1 block text-sm font-semibold text-[var(--brand-deep)]">
              {a.label}
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-[var(--muted)]">
              {a.hint}
            </span>
          </button>
        ))}
      </div>

      {msg && (
        <div className="mx-4 mb-4 border border-[var(--accent)]/40 bg-[var(--accent-soft)]/65 px-3.5 py-2.5 text-xs text-[var(--brand-deep)] sm:mx-5">
          <span className="font-medium text-[var(--brand)]">結果 · </span>
          {msg}
        </div>
      )}

      <div className="border-t border-[var(--border)] bg-[var(--linen)]/45 px-4 py-3 text-[11px] leading-relaxed text-[var(--muted)] sm:px-5">
        <p>
          缺口：完整收款／採購／生產本週未建置；客戶新增修改預留第 6 週。C001–C005
          為講義模擬客戶。
        </p>
        <p className="mt-1">
          管理者可進設定並改 U002；員工直接進設定或呼叫啟用修改應被擋。資料跨頁同步，重新整理仍保留。
        </p>
      </div>
    </section>
  );
}
