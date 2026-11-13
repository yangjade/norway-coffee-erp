"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useApp } from "@/lib/app-context";
import { BASE_DATE } from "@/lib/sample-data";

const WEEK6_ACTIONS: {
  key: string;
  label: string;
  hint: string;
  tone: "brand" | "accent" | "danger" | "neutral";
}[] = [
  {
    key: "baseline",
    label: "載入基準資料",
    hint: "C001–C005（5 位）＋ SO001–SO005",
    tone: "brand",
  },
  {
    key: "demo",
    label: "載入展示資料",
    hint: "C001–C010（10 位挪威咖啡客戶）",
    tone: "accent",
  },
  {
    key: "credit",
    label: "Staff 越權測試（C002 額度）",
    hint: "T08：改 50,000 → 應拒絕，仍 20,000",
    tone: "danger",
  },
  {
    key: "mapping",
    label: "欄位對照與版本說明",
    hint: "客戶／商品／報價欄位對照",
    tone: "neutral",
  },
];

const WEEK812_ACTIONS: {
  key: string;
  label: string;
  hint: string;
  tone: "brand" | "accent" | "danger" | "neutral";
}[] = [
  {
    key: "goto-q2o",
    label: "報價轉訂單",
    hint: "Accepted Q003 → Sales_Order",
    tone: "brand",
  },
  {
    key: "goto-shipping",
    label: "打開出貨",
    hint: "揀貨清單 · 確認出貨",
    tone: "accent",
  },
  {
    key: "goto-inventory",
    label: "打開庫存",
    hint: "On_Hand · 出貨扣庫",
    tone: "neutral",
  },
  {
    key: "goto-ar",
    label: "打開應收",
    hint: "出貨產 AR · 登記收款",
    tone: "brand",
  },
];

const WEEK7_ACTIONS: {
  key: string;
  label: string;
  hint: string;
  tone: "brand" | "accent" | "danger" | "neutral";
}[] = [
  {
    key: "goto-products",
    label: "打開商品主檔",
    hint: "List_Price／Cost／軟停用",
    tone: "brand",
  },
  {
    key: "goto-quotes",
    label: "打開報價列表",
    hint: "Q001 Sent 快照・稅 5%",
    tone: "accent",
  },
  {
    key: "staff-price",
    label: "Staff 改價測試（P002）",
    hint: "應拒絕 List_Price 變更",
    tone: "danger",
  },
  {
    key: "staff-accept",
    label: "Staff 接受報價測試",
    hint: "Sent→Accepted 應拒絕",
    tone: "danger",
  },
];

const EXTRA_ACTIONS: {
  key: string;
  label: string;
  hint: string;
  tone: "brand" | "accent" | "danger" | "neutral";
}[] = [
  { key: "reset", label: "恢復完整樣本", hint: "含擴充分頁資料量；寫入本機", tone: "accent" },
  { key: "cancel", label: "取消 SO002", hint: "KPI 應變 2／7,200／待出貨 2", tone: "brand" },
  { key: "clear", label: "清空訂單", hint: "客戶總數不變，訂單指標歸零", tone: "neutral" },
  { key: "fail", label: "載入失敗", hint: "與無資料／無權限分開顯示", tone: "danger" },
  { key: "settings", label: "直接進入設定", hint: "Staff 應被擋、Admin 可進", tone: "brand" },
  { key: "toggle", label: "呼叫啟用修改", hint: "切換 U002 啟用（測第三層）", tone: "accent" },
];

export function ClassroomSim({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const panelId = useId();
  const {
    setOrderStatus,
    clearOrders,
    resetDemoData,
    loadBaselineData,
    loadDemoData,
    setSimLoadError,
    setUserActive,
    tryForceCreditLimit,
    tryForceProductPrice,
    tryForceAcceptQuote,
    customers,
    users,
    products,
    quotations,
    currentUser,
    persistLabel,
  } = useApp();
  const [open, setOpen] = useState(true);
  const [showMapping, setShowMapping] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function flash(key: string, text: string) {
    setBusy(key);
    setMsg(text);
    window.setTimeout(() => setBusy(null), 450);
  }

  function onAction(key: string) {
    switch (key) {
      case "baseline":
        loadBaselineData();
        flash(
          key,
          "已載入基準資料：5 位客戶（C001–C005）＋原始訂單，並寫入本機 localStorage。",
        );
        break;
      case "demo":
        loadDemoData();
        flash(
          key,
          "已載入展示資料：10 位挪威的咖啡客戶（C001–C010），並寫入本機 localStorage。",
        );
        break;
      case "mapping":
        setShowMapping((v) => !v);
        flash(
          key,
          showMapping
            ? "已收合欄位對照與版本說明。"
            : "已展開欄位對照與版本說明（客戶主檔 v1）。",
        );
        break;
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
        flash(key, "已恢復完整樣本 12 位客戶（含停用 C011），並同步寫入本機");
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
      case "credit": {
        const before =
          customers.find((c) => c.Customer_ID === "C002")?.Credit_Limit ?? 0;
        const result = tryForceCreditLimit("C002", 50000);
        const after =
          result.customer?.Credit_Limit ??
          customers.find((c) => c.Customer_ID === "C002")?.Credit_Limit ??
          before;
        flash(
          key,
          result.ok
            ? `不應成功：額度已變 ${after}（目前角色 ${currentUser.Role}）`
            : `已阻擋：${result.message}（呼叫前 ${before}；目前仍 ${after}；Staff 應為 20000）`,
        );
        break;
      }
      case "goto-products":
        flash(key, "導向商品主檔");
        router.push("/products/");
        break;
      case "goto-quotes":
        flash(key, "導向報價列表（含 Q001 Sent 快照）");
        router.push("/quotations/");
        break;
      case "goto-q2o":
        flash(key, "導向報價轉訂單（第 8 週）");
        router.push("/quote-to-order/");
        break;
      case "goto-shipping":
        flash(key, "導向出貨揀貨（第 11 週）");
        router.push("/shipping/");
        break;
      case "goto-inventory":
        flash(key, "導向庫存（第 10 週）");
        router.push("/inventory/");
        break;
      case "goto-ar":
        flash(key, "導向應收（第 12 週）");
        router.push("/receivables/");
        break;
      case "staff-price": {
        const before =
          products.find((p) => p.Product_ID === "P002")?.List_Price ?? 0;
        const result = tryForceProductPrice("P002", 9999);
        const after =
          result.product?.List_Price ??
          products.find((p) => p.Product_ID === "P002")?.List_Price ??
          before;
        flash(
          key,
          result.ok
            ? `不應成功：List_Price 已變 ${after}（角色 ${currentUser.Role}）`
            : `已阻擋改價：${result.message}（前 ${before}；仍 ${after}）`,
        );
        break;
      }
      case "staff-accept": {
        const q =
          quotations.find((x) => x.Status === "Sent") ??
          quotations.find((x) => x.Quote_ID === "Q001");
        if (!q) {
          flash(key, "找不到 Sent 報價可測");
          break;
        }
        const before = q.Status;
        const result = tryForceAcceptQuote(q.Quote_ID);
        flash(
          key,
          result.ok
            ? `不應成功：${q.Quote_ID} 已變 ${result.quotation?.Status}`
            : `已阻擋接受：${result.message}（${q.Quote_ID} 仍 ${before}）`,
        );
        break;
      }
    }
  }

  return (
    <section
      id="classroom-acceptance"
      aria-label="課堂資料與驗收工具"
      className={`overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-white shadow-[var(--shadow-lift)] ${
        embedded ? "" : "animate-rise-4"
      }`}
    >
      {embedded ? (
        <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 sm:px-5">
          <p className="text-sm font-medium text-[var(--brand-deep)]">
            課堂資料與驗收工具
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
            按鈕會真正改本機資料並同步 KPI／列表。非正式登入，不能當正式資安證據。
            目前：{persistLabel}
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="relative flex w-full items-start gap-3 border-b border-[var(--border)] bg-[var(--brand)] px-4 py-4 text-left text-[var(--surface)] sm:px-5"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[linear-gradient(90deg,transparent,var(--accent-bright),transparent)]"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-[rgba(240,230,207,0.85)]">
              Norway Coffee · 驗收區
            </p>
            <h2 className="font-display mt-1.5 text-lg font-semibold tracking-wide sm:text-xl">
              課堂資料與驗收工具
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-white/78">
              挪威的咖啡教學模擬：按鈕會真正改資料並同步首頁 KPI／客戶列表（本機
              localStorage）。非正式登入，不能當正式資安證據。
            </p>
          </div>
          <span
            className="mt-1 shrink-0 text-lg text-[rgba(240,230,207,0.9)] transition-transform duration-200"
            style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
            aria-hidden
          >
            ▼
          </span>
        </button>
      )}

      {(embedded || open) && (
        <div id={panelId}>
          <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
            {WEEK6_ACTIONS.map((a) => (
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
                  課堂驗收
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

          <div className="border-t border-[var(--border)] px-4 pb-1 pt-3 sm:px-5">
            <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--brand)]">
              第 7 週 · 商品／報價煙霧測試
            </p>
          </div>
          <div className="grid gap-2.5 p-4 pt-2 sm:grid-cols-2 sm:p-5 sm:pt-2 lg:grid-cols-4">
            {WEEK7_ACTIONS.map((a) => (
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
                  Week7
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

          <div className="border-t border-[var(--border)] px-4 pb-1 pt-3 sm:px-5">
            <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--brand)]">
              第 8／10／12 週 · 轉單／庫存／應收
            </p>
          </div>
          <div className="grid gap-2.5 p-4 pt-2 sm:grid-cols-2 sm:p-5 sm:pt-2 lg:grid-cols-3">
            {WEEK812_ACTIONS.map((a) => (
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
                  W8–12
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

          {showMapping && (
            <div className="mx-4 mb-4 border border-[var(--border)] bg-[var(--linen)]/50 px-3.5 py-3 text-xs leading-relaxed text-[var(--brand-deep)] sm:mx-5">
              <p className="font-medium text-[var(--brand)]">
                欄位對照與版本說明 · 客戶主檔 v1
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--muted)]">
                <li>
                  主鍵：<code className="text-[var(--brand-deep)]">Customer_ID</code>
                  （自動流水，建立後不可改）
                </li>
                <li>
                  客戶：Customer_Name／Type／Phone／Email／Payment_Terms／Credit_Limit／Is_Active／Notes
                </li>
                <li>
                  商品：List_Price／Cost／Is_Active／Description；刪除＝軟停用
                </li>
                <li>
                  報價：Draft→Sent→Accepted／Rejected／Expired；Tax 5% 依元；Discount_Amount
                </li>
                <li>
                  三層權限：UI 隱藏 → 路由擋 → 操作層拒絕（Staff 改價／接受報價）
                </li>
                <li>
                  儲存鍵 <code className="text-[var(--brand-deep)]">norway-coffee-erp-demo-v4</code>
                  ；統計基準日 {BASE_DATE}
                </li>
                <li>
                  第 8／10／12 週：報價轉訂單、On_Hand 扣庫、應收收款（非營所稅）
                </li>
              </ul>
            </div>
          )}

          {msg && (
            <div
              className="mx-4 mb-4 border border-[var(--accent)]/40 bg-[var(--accent-soft)]/65 px-3.5 py-2.5 text-xs text-[var(--brand-deep)] sm:mx-5"
              role="status"
              aria-live="polite"
            >
              <span className="font-medium text-[var(--brand)]">結果 · </span>
              {msg}
            </div>
          )}

          <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5">
            <button
              type="button"
              className="text-xs font-medium text-[var(--brand)] underline-offset-2 hover:underline"
              aria-expanded={showExtra}
              onClick={() => setShowExtra((v) => !v)}
            >
              {showExtra ? "收合更多模擬工具 ▲" : "更多模擬工具（首頁 KPI／設定）▼"}
            </button>
            {showExtra && (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {EXTRA_ACTIONS.map((a) => (
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
            )}
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--linen)]/45 px-4 py-3 text-[11px] leading-relaxed text-[var(--muted)] sm:px-5">
            <p>
              統計基準日 {BASE_DATE}（Asia/Taipei）· {persistLabel} ·
              教學資料存於本機 localStorage（norway-coffee-erp-demo-v4）。
            </p>
            <p className="mt-1">
              已建置：第 7 週商品／報價（搜尋／狀態／列印）· 第 8 週報價轉訂單 · 第
              10 週庫存 · 第 11 週出貨揀貨 · 第 12 週應收。不做採購／生產／營所稅。
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
