"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { WEEK8_BUSINESS_DATE } from "@/lib/order-rules";

type Row = { id: string; label: string; result: string; pass?: boolean };

/** 第 8 週驗收 01–12（同步讀寫透過 context refs） */
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
      "01",
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
      "02",
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
      "03",
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
      "04",
      "承諾早於訂單日拒確認",
      Boolean(r04save.ok === false || !r04.ok),
      r04.message ?? r04save.message ?? "",
    );

    // if promised before order date was rejected on save, that's also ok for 04
    // restore for 05
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
      "05",
      "晚交未同意可存不可確認",
      Boolean(r05save.ok && !r05conf.ok),
      r05conf.message ?? "",
    );

    const before06 = app.orders.length;
    const r06 = app.convertAcceptedQuote("QW8-EXP", {
      asOfDate: WEEK8_BUSINESS_DATE,
    });
    setRow(
      "06",
      "逾期 Accepted 拒轉",
      !r06.ok && app.orders.length === before06,
      r06.message ?? "",
    );

    const before07 = app.orders.length;
    const r07 = app.convertAcceptedQuote("Q001", {
      asOfDate: WEEK8_BUSINESS_DATE,
    });
    setRow(
      "07",
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
      "08",
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
      "09",
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
      "10",
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
      setRow("11", "Admin 取消另一確認單", false, "找不到可取消單");
    } else {
      const r11 = app.cancelSalesOrder(other.Order_ID, "測試取消");
      const after = app.orders.find((o) => o.Order_ID === other.Order_ID);
      const re = app.confirmSalesOrder(other.Order_ID);
      setRow(
        "11",
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
      "12",
      "編號／客戶／狀態可查",
      byId && byCust && byStatus,
      `ok=${byId && byCust && byStatus}`,
    );

    setBusy(false);
  }

  return (
    <div
      className="space-y-3 border-t border-[var(--border)] px-4 py-4 sm:px-5"
      data-week8="acceptance-01-12"
      data-week8-marker="week8-official-20261118"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--brand)]">
          第 8 週驗收測試 01–12
        </p>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={busy}
          onClick={runAll}
        >
          {busy ? "測試中…" : "一鍵跑 01–12"}
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => router.push("/quote-to-order/")}
        >
          手動轉單
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        會重設樣本後依序操作；案例 7,560／改量 8,694。確認不扣庫。
      </p>
      {rows.length > 0 && (
        <ul className="space-y-1 text-xs">
          {rows.map((r) => (
            <li
              key={r.id}
              className={r.pass ? "text-[var(--brand-deep)]" : "text-[var(--danger)]"}
            >
              <span className="font-mono">{r.id}</span> {r.label} — {r.result}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
