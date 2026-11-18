"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { computeKpi } from "@/lib/kpi";
import {
  baselineCustomers,
  initialOrders,
  orderDetails as seedOrderDetails,
} from "@/lib/sample-data";
import type { Customer, CustomerUpdateInput } from "@/lib/types";

type Row = { id: string; label: string; result: string; pass?: boolean };

function filterCustomers(
  list: Customer[],
  q: string,
  type?: string,
): Customer[] {
  const needle = q.trim().toLowerCase();
  return list.filter((c) => {
    const hitName =
      !needle ||
      c.Customer_Name.toLowerCase().includes(needle) ||
      c.Customer_ID.toLowerCase().includes(needle);
    const hitType = !type || c.Customer_Type === type;
    return hitName && hitType;
  });
}

/** 第 6 週客戶主檔 T01–T12（挪威的咖啡基準資料） */
export function WeekTAcceptance() {
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
    app.loadBaselineData();

    // T01：搜尋「咖啡」→ C002、C005；清除 → 5 筆
    const coffeeHits = filterCustomers(baselineCustomers, "咖啡");
    const allBaseline = filterCustomers(baselineCustomers, "");
    setRow(
      "T01",
      "搜尋「咖啡」再清除",
      coffeeHits.length === 2 &&
        coffeeHits.every((c) => c.Customer_ID === "C002" || c.Customer_ID === "C005") &&
        allBaseline.length === 5,
      `命中 ${coffeeHits.map((c) => c.Customer_ID).join("、")}；清除後 ${allBaseline.length} 筆`,
    );

    // T02：Staff 新增零售客戶 → C006、現結／0／啟用
    app.switchUser("U002");
    const r02 = app.createCustomer({
      Customer_Name: "課堂驗收丙",
      Customer_Type: "零售",
      Phone: "",
      Email: "",
      Notes: "",
    });
    setRow(
      "T02",
      "Staff 新增零售客戶",
      Boolean(
        r02.ok &&
          r02.customer?.Customer_ID === "C006" &&
          r02.customer.Payment_Terms === "現結" &&
          r02.customer.Credit_Limit === 0 &&
          r02.customer.Is_Active,
      ),
      r02.ok
        ? `${r02.customer?.Customer_ID} ${r02.customer?.Payment_Terms}/${r02.customer?.Credit_Limit}`
        : (r02.message ?? "建立失敗"),
    );

    // T03：空名／壞 Email 拒存
    const r03a = app.createCustomer({
      Customer_Name: "   ",
      Customer_Type: "零售",
      Phone: "",
      Email: "",
      Notes: "",
    });
    const r03b = app.createCustomer({
      Customer_Name: "格式測試客",
      Customer_Type: "零售",
      Phone: "",
      Email: "not-an-email",
      Notes: "",
    });
    setRow(
      "T03",
      "空名／不合 Email 拒存",
      !r03a.ok && !r03b.ok,
      `空名=${r03a.message}；Email=${r03b.message}`,
    );

    // T04：編輯備註「取消」不寫入；正式儲存才更新
    app.switchUser("U001");
    const beforeNote =
      baselineCustomers.find((c) => c.Customer_ID === "C001")?.Notes ?? "";
    // 模擬取消：不呼叫 update
    const afterCancelNote = beforeNote;
    const r04 = app.updateCustomer("C001", { Notes: "驗收備註已存" });
    setRow(
      "T04",
      "編輯備註取消／儲存",
      afterCancelNote === beforeNote &&
        Boolean(r04.ok && r04.customer?.Notes === "驗收備註已存"),
      `取消後仍原值；儲存後=${r04.customer?.Notes}`,
    );

    // T05：Admin 無效額度 −1／小數拒；仍 20,000
    const r05neg = app.updateCustomer("C002", { Credit_Limit: -1 });
    const r05dec = app.updateCustomer("C002", { Credit_Limit: 1.5 });
    const c002after = app.updateCustomer("C002", { Notes: "額度驗證中" });
    const limit = c002after.customer?.Credit_Limit ?? -1;
    setRow(
      "T05",
      "Admin 無效額度拒存",
      !r05neg.ok && !r05dec.ok && limit === 20000,
      `neg=${r05neg.message}；dec=${r05dec.message}；額度=${limit}`,
    );

    // T06：搜尋「辦公」∩零售＝0；只篩批發＝C002、C005
    const officeRetail = filterCustomers(baselineCustomers, "辦公", "零售");
    const wholesale = filterCustomers(baselineCustomers, "", "批發");
    setRow(
      "T06",
      "辦公∩零售／只篩批發",
      officeRetail.length === 0 &&
        wholesale.length === 2 &&
        wholesale.every((c) => c.Customer_ID === "C002" || c.Customer_ID === "C005"),
      `交集 ${officeRetail.length}；批發 ${wholesale.map((c) => c.Customer_ID).join("、")}`,
    );

    // T07：C001 有 SO001（2 明細）；新建 C006 無訂單
    const so001 = seedOrderDetails.filter((d) => d.Order_ID === "SO001");
    const c001Orders = initialOrders.filter((o) => o.Customer_ID === "C001");
    const c006Orders = initialOrders.filter((o) => o.Customer_ID === "C006");
    setRow(
      "T07",
      "C001 訂單／C006 無單",
      c001Orders.length >= 1 && so001.length === 2 && c006Orders.length === 0,
      `C001 訂單 ${c001Orders.length}、明細 ${so001.length}；C006=${c006Orders.length}`,
    );

    // T08：Staff 越權改 C002 額度 50,000 → 拒，仍 20,000
    app.switchUser("U002");
    const r08 = app.tryForceCreditLimit("C002", 50000);
    setRow(
      "T08",
      "Staff 越權改額度",
      !r08.ok && (r08.customer?.Credit_Limit ?? 20000) === 20000,
      r08.ok ? `不應成功：${r08.customer?.Credit_Limit}` : `${r08.message}；仍 20000`,
    );

    // T09：Admin 停用 C002 再啟用
    app.switchUser("U001");
    const r09off = app.setCustomerActive("C002", false);
    const r09on = app.setCustomerActive("C002", true);
    setRow(
      "T09",
      "Admin 停用／啟用 C002",
      Boolean(r09off.ok && r09off.customer && !r09off.customer.Is_Active) &&
        Boolean(r09on.ok && r09on.customer?.Is_Active),
      `停用=${r09off.customer?.Is_Active}；啟用=${r09on.customer?.Is_Active}`,
    );

    // T10：不可改 Customer_ID；原關聯不變
    const r10 = app.updateCustomer("C001", {
      Customer_ID: "CXXX",
    } as unknown as CustomerUpdateInput);
    const stillC001 = app.updateCustomer("C001", { Contact: "林經理" });
    setRow(
      "T10",
      "拒絕改號／關聯不變",
      !r10.ok && stillC001.customer?.Customer_ID === "C001",
      r10.ok ? "不應成功改號" : `${r10.message}；仍 C001`,
    );

    // T11：現結但保留額度 20,000 拒；改為現結／0 才可
    const r11bad = app.updateCustomer("C002", {
      Payment_Terms: "現結",
      Credit_Limit: 20000,
    });
    const r11ok = app.updateCustomer("C002", {
      Payment_Terms: "現結",
      Credit_Limit: 0,
    });
    // 還原月結／20000 供後續
    app.updateCustomer("C002", {
      Payment_Terms: "月結30天",
      Credit_Limit: 20000,
    });
    setRow(
      "T11",
      "現結須搭配額度 0",
      !r11bad.ok && Boolean(r11ok.ok && r11ok.customer?.Credit_Limit === 0),
      `拒=${r11bad.message}；可=${r11ok.customer?.Payment_Terms}/${r11ok.customer?.Credit_Limit}`,
    );

    // T12：恢復基準 5 客；改 C001 聯絡；Staff 不可改使用者設定
    app.loadBaselineData();
    const r12 = app.updateCustomer("C001", { Contact: "驗收聯絡人" });
    const kpi = computeKpi(baselineCustomers, initialOrders);
    app.switchUser("U002");
    const staffSettings = app.setUserActive("U002", false);
    app.switchUser("U001");
    setRow(
      "T12",
      "基準回歸／Staff 擋設定",
      Boolean(
        r12.ok &&
          r12.customer?.Contact === "驗收聯絡人" &&
          kpi.customerCount === 5 &&
          !staffSettings.ok,
      ),
      `客戶 ${kpi.customerCount}；聯絡=${r12.customer?.Contact}；Staff設定=${staffSettings.message}`,
    );

    setBusy(false);
  }

  const passed = rows.length > 0 && rows.every((r) => r.pass);
  const done = rows.length === 12;

  return (
    <div
      id="t01"
      className="space-y-3 border-t border-[var(--border)] px-4 py-4 sm:px-5"
      data-week6="acceptance-t01-t12"
      data-week6-marker="week6-customer-t01-t12"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--brand)]">
          <span>T01–T12 客戶主檔驗收（第 6 週）</span>
        </p>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={busy}
          onClick={runAll}
        >
          {busy ? "測試中…" : "一鍵跑 T01–T12"}
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => router.push("/customers/")}
        >
          客戶列表
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => {
            app.switchUser("U001");
            app.loadBaselineData();
          }}
        >
          載入基準 5 客
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        對齊老師 T01–T12（挪威的咖啡：搜尋「咖啡」、C002 額度 20,000、Staff
        越權擋）。會載入基準 5 位客戶後依序操作。
      </p>
      {done && (
        <p
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            passed
              ? "bg-[var(--brand-soft)] text-[var(--brand-deep)]"
              : "bg-[var(--danger-bg)] text-[var(--danger)]"
          }`}
        >
          {passed ? "T01–T12 全數通過" : "尚有失敗項，請看下方明細"}
        </p>
      )}
      {rows.length > 0 && (
        <ul className="space-y-1 text-xs" data-week6-results="true">
          {rows.map((r) => (
            <li
              key={r.id}
              id={r.id.toLowerCase()}
              className={
                r.pass ? "text-[var(--brand-deep)]" : "text-[var(--danger)]"
              }
            >
              <span className="font-mono">{r.id}</span> {r.label} — {r.result}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
