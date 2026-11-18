"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { WEEK8_BUSINESS_DATE } from "@/lib/order-rules";

type Row = { id: string; label: string; result: string; pass?: boolean };

/** S01–S13：要測什麼／過了會怎樣（高於截圖的課堂可跑體驗） */
const SCENARIO_HELP: { id: string; label: string; help: string }[] = [
  {
    id: "S01",
    label: "有效已接受報價轉單",
    help: "測：已接受報價一鍵轉單。過了：得到草稿單，明細 2 行、未稅 7560。",
  },
  {
    id: "S02",
    label: "同報價連按／再轉",
    help: "測：同一報價連按轉單。過了：不會多開第二張，仍指回同一訂單。",
  },
  {
    id: "S03",
    label: "數量 0／-1 拒存",
    help: "測：草稿把數量改成 0 或 -1。過了：拒絕儲存，原數量不動。",
  },
  {
    id: "S04",
    label: "承諾早於訂單日拒確認",
    help: "測：承諾日早於訂單日就按確認。過了：擋下，無法確認。",
  },
  {
    id: "S05",
    label: "晚交未同意可存不可確認",
    help: "測：承諾晚於期望且未勾同意。過了：可存草稿，但確認失敗。",
  },
  {
    id: "S06",
    label: "逾期 Accepted 拒轉",
    help: "測：有效期已過的 Accepted 報價轉單。過了：拒絕轉單。",
  },
  {
    id: "S07",
    label: "未接受報價拒轉",
    help: "測：未接受狀態的報價轉單。過了：拒絕轉單。",
  },
  {
    id: "S08",
    label: "Staff 改／取消已確認拒",
    help: "測：Staff 改已確認單或取消。過了：兩種操作都被擋。",
  },
  {
    id: "S09",
    label: "Admin 重開改 12 再確認＝8694",
    help: "測：Admin 重開→改量 12→再確認。過了：含稅總額 8694，有重開稽核。",
  },
  {
    id: "S10",
    label: "主檔改 700 訂單單價仍 600",
    help: "測：改商品主檔牌價。過了：訂單快照單價仍 600，不被帶動。",
  },
  {
    id: "S11",
    label: "Admin 取消另一確認單",
    help: "測：Admin 取消另一張已確認單。過了：變已取消，且不能再確認。",
  },
  {
    id: "S12",
    label: "編號／客戶／狀態可查",
    help: "測：用訂單號、客戶、狀態找單。過了：三種查詢都能命中。",
  },
  {
    id: "S13",
    label: "勾選改期同意後可確認",
    help: "測：晚交草稿勾「改期同意」再確認。過了：變成已確認，且未扣庫。",
  },
];

/** 第 8 週驗收 S01–S13 */
export function Week8Acceptance() {
  const router = useRouter();
  const app = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  function setRow(id: string, label: string, pass: boolean, detail: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      next.push({
        id,
        label,
        pass,
        result: `${pass ? "通過" : "失敗"} · ${detail}`,
      });
      return next.sort((a, b) => a.id.localeCompare(b.id));
    });
  }

  function runAll() {
    setBusy(true);
    setRows([]);
    app.switchUser("U001");
    app.resetDemoData();

    const r01 = app.convertAcceptedQuote("QT-20261118-001", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const orderId = r01.order?.Order_ID ?? "";
    setRow(
      "S01",
      "有效已接受報價轉單",
      Boolean(
        r01.ok &&
          r01.order?.Order_Status === "Draft" &&
          (r01.details?.length ?? 0) === 2 &&
          r01.order.Quote_ID === "QT-20261118-001" &&
          r01.order.Total_Amount === 7560,
      ),
      r01.message ?? `total=${r01.order?.Total_Amount}`,
    );

    const r02a = app.convertAcceptedQuote("QT-20261118-001");
    const r02b = app.convertAcceptedQuote("QT-20261118-001");
    setRow(
      "S02",
      "同報價連按／再轉",
      Boolean(
        r02a.order?.Order_ID === orderId &&
          r02b.order?.Order_ID === orderId &&
          app.orders.filter((o) => o.Quote_ID === "QT-20261118-001").length <=
            1,
      ),
      `id=${r02b.order?.Order_ID}`,
    );

    const dP002 = (r01.details ?? []).find((d) => d.Product_ID === "P002");
    const beforeQty = dP002?.Qty ?? 10;
    const r03a = app.saveDraftOrder(orderId, {
      qtyByDetailId: { [dP002!.Detail_ID]: 0 },
    });
    const r03b = app.saveDraftOrder(orderId, {
      qtyByDetailId: { [dP002!.Detail_ID]: -1 },
    });
    const still = app.orderDetails.find((d) => d.Detail_ID === dP002!.Detail_ID);
    setRow(
      "S03",
      "數量 0／-1 拒存",
      !r03a.ok && !r03b.ok && (still?.Qty ?? 0) === beforeQty,
      `${r03a.message}`,
    );

    const r04save = app.saveDraftOrder(orderId, {
      promisedDate: "2026-11-17",
    });
    const r04 = app.confirmSalesOrder(orderId);
    app.saveDraftOrder(orderId, {
      promisedDate: "2026-11-23",
      requestedDate: "2026-11-23",
      deliveryAgreed: false,
    });
    setRow(
      "S04",
      "承諾早於訂單日拒確認",
      Boolean(r04save.ok === false || !r04.ok),
      r04.message ?? r04save.message ?? "",
    );

    app.saveDraftOrder(orderId, {
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-25",
      deliveryAgreed: false,
    });
    const r05save = app.saveDraftOrder(orderId, {
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-25",
      deliveryAgreed: false,
    });
    const r05conf = app.confirmSalesOrder(orderId);
    setRow(
      "S05",
      "晚交未同意可存不可確認",
      Boolean(r05save.ok && !r05conf.ok),
      r05conf.message ?? "",
    );

    const before06 = app.orders.length;
    const r06 = app.convertAcceptedQuote("QW8-EXP", {
      asOfDate: WEEK8_BUSINESS_DATE,
    });
    setRow(
      "S06",
      "逾期 Accepted 拒轉",
      !r06.ok && app.orders.length === before06,
      r06.message ?? "",
    );

    const before07 = app.orders.length;
    const r07 = app.convertAcceptedQuote("Q001", {
      asOfDate: WEEK8_BUSINESS_DATE,
    });
    setRow(
      "S07",
      "未接受報價拒轉",
      !r07.ok && app.orders.length === before07,
      r07.message ?? "",
    );

    app.saveDraftOrder(orderId, {
      promisedDate: "2026-11-23",
      requestedDate: "2026-11-23",
      deliveryAgreed: true,
    });
    app.confirmSalesOrder(orderId);
    app.switchUser("U002");
    const detail = app.orderDetails.find(
      (d) => d.Order_ID === orderId && d.Product_ID === "P002",
    )!;
    const r08edit = app.saveDraftOrder(orderId, {
      qtyByDetailId: { [detail.Detail_ID]: 12 },
    });
    const r08cancel = app.cancelSalesOrder(orderId, "staff try");
    const st08 = app.orders.find((o) => o.Order_ID === orderId)?.Order_Status;
    setRow(
      "S08",
      "Staff 改／取消已確認拒",
      !r08edit.ok && !r08cancel.ok && st08 === "Confirmed",
      `edit=${r08edit.message}; status=${st08}`,
    );

    app.switchUser("U001");
    const r09re = app.reopenSalesOrder(orderId, "客戶追加 2 包");
    const d9 = app.orderDetails.find(
      (d) => d.Order_ID === orderId && d.Product_ID === "P002",
    )!;
    const r09save = app.saveDraftOrder(orderId, {
      qtyByDetailId: { [d9.Detail_ID]: 12 },
      deliveryAgreed: true,
      promisedDate: "2026-11-23",
      requestedDate: "2026-11-23",
    });
    const r09conf = app.confirmSalesOrder(orderId);
    const total09 = app.orders.find((o) => o.Order_ID === orderId)?.Total_Amount;
    const hasAudit = app.orderAudits.some(
      (a) => a.Order_ID === orderId && a.Action === "重開",
    );
    setRow(
      "S09",
      "Admin 重開改 12 再確認＝8694",
      Boolean(
        r09re.ok && r09save.ok && r09conf.ok && total09 === 8694 && hasAudit,
      ),
      `total=${total09}; audit=${hasAudit}`,
    );

    const snap = app.orderDetails.find(
      (d) => d.Order_ID === orderId && d.Product_ID === "P002",
    )!.Unit_Price;
    app.updateProduct("P002", { List_Price: 700 });
    const snap2 = app.orderDetails.find(
      (d) => d.Order_ID === orderId && d.Product_ID === "P002",
    )!.Unit_Price;
    const list = app.products.find((p) => p.Product_ID === "P002")!.List_Price;
    setRow(
      "S10",
      "主檔改 700 訂單單價仍 600",
      snap === 600 && snap2 === 600 && list === 700,
      `snapshot=${snap2}; list=${list}`,
    );

    const other = app.orders.find(
      (o) =>
        o.Order_Status === "Confirmed" &&
        o.Order_ID !== orderId &&
        !o.Stock_Deducted,
    );
    if (!other) {
      setRow("S11", "Admin 取消另一確認單", false, "找不到可取消單");
    } else {
      const r11 = app.cancelSalesOrder(other.Order_ID, "測試取消");
      const after = app.orders.find((o) => o.Order_ID === other.Order_ID);
      const re = app.confirmSalesOrder(other.Order_ID);
      setRow(
        "S11",
        "Admin 取消另一確認單",
        Boolean(r11.ok && after?.Order_Status === "Cancelled" && !re.ok),
        `${other.Order_ID}→${after?.Order_Status}`,
      );
    }

    const byId = app.orders.some(
      (o) => o.Order_ID === orderId || o.Quote_ID === "QT-20261118-001",
    );
    const byCust = app.orders.some((o) => o.Customer_ID === "C001");
    const byStatus = app.orders.some((o) => o.Order_Status === "Confirmed");
    setRow(
      "S12",
      "編號／客戶／狀態可查",
      byId && byCust && byStatus,
      `ok=${byId && byCust && byStatus}`,
    );

    // S13：獨立晚交草稿 → 勾同意 → 確認成功且未扣庫
    app.switchUser("U001");
    app.resetDemoData();
    const r13c = app.convertAcceptedQuote("QT-20261118-001", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-25",
    });
    const id13 = r13c.order?.Order_ID ?? "";
    app.saveDraftOrder(id13, {
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-25",
      deliveryAgreed: false,
    });
    const blocked = app.confirmSalesOrder(id13);
    app.saveDraftOrder(id13, { deliveryAgreed: true });
    const allowed = app.confirmSalesOrder(id13);
    const after13 = app.orders.find((o) => o.Order_ID === id13);
    setRow(
      "S13",
      "勾選改期同意後可確認",
      Boolean(
        !blocked.ok &&
          allowed.ok &&
          after13?.Order_Status === "Confirmed" &&
          !after13.Stock_Deducted,
      ),
      `block=${blocked.message}; stock=${after13?.Stock_Deducted}`,
    );

    setBusy(false);
  }

  const passCount = rows.filter((r) => r.pass).length;
  const done = rows.length > 0;

  return (
    <div
      className="space-y-3 border-t border-[var(--border)] px-4 py-4 sm:px-5"
      data-week8="acceptance-s01-s13"
      data-week8-marker="week8-official-20261118"
      id="acceptance-s01-s13"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--brand)]">
          銷售驗收 S01–S13（第 8 週）
        </p>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={busy}
          onClick={runAll}
        >
          {busy ? "測試中…" : "一鍵跑 S01–S13"}
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => router.push("/quote-to-order/")}
        >
          手動轉單
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => router.push("/orders/")}
        >
          訂單列表
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        會重設樣本後依序操作；案例 7,560／改量 8,694。確認不扣庫。S13 驗證晚交勾同意後可確認。
      </p>
      {done && (
        <p
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            passCount === 13
              ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
              : "bg-[var(--danger)]/10 text-[var(--danger)]"
          }`}
        >
          結果：{passCount}／13 通過
          {passCount === 13 ? " · 可課堂演示" : " · 請展開失敗項查看原因"}
        </p>
      )}
      <ol className="space-y-2 text-xs">
        {SCENARIO_HELP.map((s) => {
          const r = rows.find((x) => x.id === s.id);
          return (
            <li
              key={s.id}
              className={`rounded-md border px-3 py-2 ${
                r?.pass === false
                  ? "border-[var(--danger)]/40 bg-[var(--danger)]/5"
                  : r?.pass
                    ? "border-[var(--brand)]/25 bg-[var(--brand-soft)]/30"
                    : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <p className="font-medium text-[var(--ink)]">
                <span className="font-mono text-[var(--brand)]">{s.id}</span>{" "}
                {s.label}
                {r && (
                  <span
                    className={
                      r.pass
                        ? "ml-2 text-[var(--brand-deep)]"
                        : "ml-2 text-[var(--danger)]"
                    }
                  >
                    · {r.result}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[var(--muted)]">{s.help}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
