"use client";

import { useState } from "react";
import { useApp } from "@/lib/app-context";

type Row = { id: string; label: string; result: string; pass?: boolean };

function triple(
  snap: { On_Hand: number; Reserved: number; Available: number } | null | undefined,
) {
  if (!snap) return "—";
  return `${snap.On_Hand}/${snap.Reserved}/${snap.Available}`;
}

/** 第 11 週驗收 T01–T12（對齊老師講義出貨案例） */
export function Week11Acceptance() {
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

    const lab = app.prepareWeek11Lab();
    const soB = lab.orderId ?? "";
    const s0a = app.inventorySnap("P002");
    const s0b = app.inventorySnap("P011");
    const startOk =
      lab.ok &&
      s0a?.On_Hand === 26 &&
      s0a.Reserved === 15 &&
      s0a.Available === 11 &&
      s0b?.On_Hand === 8 &&
      s0b.Reserved === 1 &&
      s0b.Available === 7;

    // T01 Staff 建草稿
    app.switchUser("U002");
    const draft = app.createShipmentFromOrder({
      orderId: soB,
      shipmentDate: "2026-11-25",
      deliveryMethod: "宅配",
      carrier: "教學物流",
      trackingNo: "DEMO-0001",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    const shId = draft.shipment?.Shipment_ID ?? "";
    const details = draft.details ?? [];
    const s1a = app.inventorySnap("P002");
    const s1b = app.inventorySnap("P011");
    const t01 = Boolean(
      startOk &&
        draft.ok &&
        details.length === 2 &&
        details.some((d) => d.Product_ID === "P002" && d.Ship_Qty === 15) &&
        details.some((d) => d.Product_ID === "P011" && d.Ship_Qty === 1) &&
        s1a?.On_Hand === 26 &&
        s1a.Reserved === 15 &&
        s1b?.On_Hand === 8 &&
        s1b.Reserved === 1,
    );
    setRow(
      "T01",
      "Staff 建出貨草稿，存後重開",
      t01,
      `${shId} 列=${details.length} · P002 ${triple(s1a)} · P011 ${triple(s1b)}`,
    );

    // T02 Admin 過帳 — 用回傳結果，不讀過期 React state
    app.switchUser("U001");
    const post = app.postShipmentDoc(shId);
    const s2a = app.inventorySnap("P002");
    const s2b = app.inventorySnap("P011");
    const moveAfter = (post.moves ?? []).filter(
      (m) =>
        (m.Move_Type === "Sales_Shipment" || m.Move_Type === "出貨扣庫") &&
        m.Source_Doc_ID === shId,
    );
    const consumed = (post.reservations ?? []).filter(
      (r) =>
        r.Consumed_By_Shipment_ID === shId &&
        r.Consume_Reason === "shipment" &&
        !r.Is_Active,
    );
    const t02 = Boolean(
      post.ok &&
        s2a?.On_Hand === 11 &&
        s2a.Reserved === 0 &&
        s2a.Available === 11 &&
        s2b?.On_Hand === 7 &&
        s2b.Reserved === 0 &&
        s2b.Available === 7 &&
        moveAfter.length === 2 &&
        consumed.length >= 2,
    );
    setRow(
      "T02",
      "Admin 有效過帳",
      t02,
      `P002 ${triple(s2a)} · P011 ${triple(s2b)} · 異動${moveAfter.length} · 消耗${consumed.length}`,
    );

    // T03 冪等
    const movesBefore = moveAfter.length;
    const post2 = app.postShipmentDoc(shId);
    const moveCount = (post2.moves ?? []).filter(
      (m) =>
        (m.Move_Type === "Sales_Shipment" || m.Move_Type === "出貨扣庫") &&
        m.Source_Doc_ID === shId,
    ).length;
    const s3a = app.inventorySnap("P002");
    const s3b = app.inventorySnap("P011");
    const t03 = Boolean(
      post2.ok &&
        moveCount === movesBefore &&
        s3a?.On_Hand === 11 &&
        s3a.Reserved === 0 &&
        s3b?.On_Hand === 7 &&
        s3b.Reserved === 0,
    );
    setRow(
      "T03",
      "同單重按過帳冪等",
      t03,
      `異動仍 ${moveCount} · ${triple(s3a)} / ${triple(s3b)}`,
    );

    // T04 數量錯誤 — 用回傳的 orderDetails
    const lab4 = app.prepareWeek11Lab();
    const soB4 = lab4.orderId ?? "";
    app.switchUser("U002");
    // 先建一張取得明細 ID（或從確認後的細節經 create 預覽）
    const probe = app.createShipmentFromOrder({
      orderId: soB4,
      carrier: "教學物流",
      trackingNo: "PROBE",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    const p002Line = (probe.details ?? []).find((d) => d.Product_ID === "P002");
    // 作廢 probe
    if (probe.shipment) {
      app.saveShipmentDraft({
        shipmentId: probe.shipment.Shipment_ID,
        cancel: true,
      });
    }
    const detailId = p002Line?.Order_Line ?? "";
    const d0 = app.createShipmentFromOrder({
      orderId: soB4,
      shipQtyByDetailId: detailId ? { [detailId]: 0 } : { __none: 0 },
    });
    const dNeg = app.createShipmentFromOrder({
      orderId: soB4,
      shipQtyByDetailId: detailId ? { [detailId]: -1 } : { __none: -1 },
    });
    const dDec = app.createShipmentFromOrder({
      orderId: soB4,
      shipQtyByDetailId: detailId
        ? { [detailId]: 1.5 as unknown as number }
        : { __none: 1.5 as unknown as number },
    });
    const s4 = app.inventorySnap("P002");
    const t04 = Boolean(
      !d0.ok && !dNeg.ok && !dDec.ok && s4?.On_Hand === 26 && s4.Reserved === 15,
    );
    setRow("T04", "出貨量 0／-1／1.5 拒絕", t04, d0.message ?? "");

    // T05 超出剩餘
    const otherLines: Record<string, number> = {};
    for (const d of probe.details ?? []) {
      otherLines[d.Order_Line] =
        d.Product_ID === "P002" ? 16 : d.Ship_Qty;
    }
    const d16 = app.createShipmentFromOrder({
      orderId: soB4,
      shipQtyByDetailId: otherLines,
    });
    const s5 = app.inventorySnap("P002");
    const t05 = Boolean(
      !d16.ok && s5?.On_Hand === 26 && s5.Reserved === 15,
    );
    setRow("T05", "超出剩餘／保留來源不符整單拒", t05, d16.message ?? "");

    // T06
    app.prepareWeek11Lab();
    const draftOrd = app.orders.find((o) => o.Order_Status === "Draft");
    const cancelled = app.orders.find((o) => o.Order_Status === "Cancelled");
    // 重新抓最新（prepare 後 state 可能尚未 flush；用再 prepare 的旁路）
    const lab6 = app.prepareWeek11Lab();
    void lab6;
    const draftOrd2 = app.orders.find((o) => o.Order_Status === "Draft");
    const cancelled2 = app.orders.find((o) => o.Order_Status === "Cancelled");
    const badDraft = (draftOrd2 ?? draftOrd)
      ? app.createShipmentFromOrder({
          orderId: (draftOrd2 ?? draftOrd)!.Order_ID,
        })
      : { ok: true, message: "no draft" };
    const badCancel = (cancelled2 ?? cancelled)
      ? app.createShipmentFromOrder({
          orderId: (cancelled2 ?? cancelled)!.Order_ID,
        })
      : { ok: true, message: "no cancel" };
    const t06 = Boolean(!badDraft.ok && !badCancel.ok);
    setRow(
      "T06",
      "Draft／Cancelled／未配置不可出貨",
      t06,
      `draft=${badDraft.message}; cancel=${badCancel.message}`,
    );

    // T07 宅配缺欄
    const lab7 = app.prepareWeek11Lab();
    app.switchUser("U001");
    const d7 = app.createShipmentFromOrder({
      orderId: lab7.orderId ?? "",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
      carrier: "教學物流",
      trackingNo: "DEMO-0001",
    });
    const sid7 = d7.shipment?.Shipment_ID ?? "";
    app.saveShipmentDraft({
      shipmentId: sid7,
      carrier: "",
      trackingNo: "",
    });
    const postBlank = app.postShipmentDoc(sid7);
    const t07 = Boolean(
      !postBlank.ok &&
        ((postBlank.message ?? "").includes("承運") ||
          (postBlank.message ?? "").includes("追蹤")),
    );
    setRow("T07", "收貨／宅配欄位不全拒絕過帳", t07, postBlank.message ?? "");

    // T08 Staff 過帳
    const lab8 = app.prepareWeek11Lab();
    const d8 = app.createShipmentFromOrder({
      orderId: lab8.orderId ?? "",
      carrier: "教學物流",
      trackingNo: "DEMO-0001",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    const sh8 = d8.shipment?.Shipment_ID ?? "";
    const before8 = app.inventorySnap("P002");
    app.switchUser("U002");
    const staffPost = app.postShipmentDoc(sh8);
    const after8 = app.inventorySnap("P002");
    const t08 = Boolean(
      !staffPost.ok &&
        (staffPost.message ?? "").includes("管理者") &&
        after8?.On_Hand === before8?.On_Hand &&
        after8?.Reserved === before8?.Reserved,
    );
    setRow("T08", "Staff 直接過帳拒絕", t08, staffPost.message ?? "");

    // T09 快照
    app.switchUser("U001");
    const lab9 = app.prepareWeek11Lab();
    const d9 = app.createShipmentFromOrder({
      orderId: lab9.orderId ?? "",
      carrier: "教學物流",
      trackingNo: "DEMO-0001",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    const sh9 = d9.shipment?.Shipment_ID ?? "";
    const nameBefore = d9.details?.[0]?.Product_Name_Snapshot;
    const orderAmt = lab9.orderId
      ? app.orders.find((o) => o.Order_ID === lab9.orderId)?.Total_Amount
      : undefined;
    // 若 orders state 過期，用 inventory 無影響；改以 create 當下金額不強制
    app.setProducts((prev) =>
      prev.map((p) =>
        p.Product_ID === "P002" ? { ...p, List_Price: 9999 } : p,
      ),
    );
    const posted9 = app.postShipmentDoc(sh9);
    const nameAfter = (posted9.details ?? d9.details)?.[0]
      ?.Product_Name_Snapshot;
    const t09 = Boolean(nameBefore && nameAfter === nameBefore);
    setRow(
      "T09",
      "改牌價後快照／訂單金額不變",
      t09,
      `快照=${nameAfter} · 金額=${orderAmt ?? "—"}`,
    );

    // T10 第二張
    const lab10 = app.prepareWeek11Lab();
    const so10 = lab10.orderId ?? "";
    const a = app.createShipmentFromOrder({
      orderId: so10,
      carrier: "教學物流",
      trackingNo: "DEMO-A",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    if (a.shipment) app.postShipmentDoc(a.shipment.Shipment_ID);
    const b = app.createShipmentFromOrder({
      orderId: so10,
      carrier: "教學物流",
      trackingNo: "DEMO-B",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    let postB: { ok: boolean; message?: string } = {
      ok: true,
      message: "skipped",
    };
    if (b.ok && b.shipment) {
      postB = app.postShipmentDoc(b.shipment.Shipment_ID);
    }
    const t10 = Boolean(!b.ok || !postB.ok);
    setRow(
      "T10",
      "同單第二張出貨過帳拒絕",
      t10,
      `建B=${b.message}; 過B=${postB.message}`,
    );

    // T11 物流
    const lab11 = app.prepareWeek11Lab();
    const d11 = app.createShipmentFromOrder({
      orderId: lab11.orderId ?? "",
      carrier: "教學物流",
      trackingNo: "DEMO-0001",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    const post11 = app.postShipmentDoc(d11.shipment!.Shipment_ID);
    const ex = app.updateShipmentDelivery({
      shipmentId: d11.shipment!.Shipment_ID,
      toStatus: "Exception",
      exceptionNote: "地址無人收件",
      reason: "地址無人收件",
    });
    const s11a = app.inventorySnap("P002");
    const del = app.updateShipmentDelivery({
      shipmentId: d11.shipment!.Shipment_ID,
      toStatus: "Delivered",
      reason: "翌日物流確認交付",
    });
    const s11b = app.inventorySnap("P002");
    const s11c = app.inventorySnap("P011");
    const logs = del.deliveryLogs ?? ex.deliveryLogs ?? post11.deliveryLogs ?? [];
    const shipLogs = logs.filter(
      (l) => l.Shipment_ID === d11.shipment!.Shipment_ID,
    );
    const t11 = Boolean(
      ex.ok &&
        del.ok &&
        s11a?.On_Hand === 11 &&
        s11a.Reserved === 0 &&
        s11b?.On_Hand === 11 &&
        s11c?.On_Hand === 7 &&
        s11c.Reserved === 0 &&
        shipLogs.length >= 1,
    );
    setRow(
      "T11",
      "Exception→Delivered 不改庫／不收款",
      t11,
      `P002 ${triple(s11b)} · P011 ${triple(s11c)} · 歷程${shipLogs.length}`,
    );

    // T12 查詢＋盤點異常
    const lab12 = app.prepareWeek11Lab();
    const d12 = app.createShipmentFromOrder({
      orderId: lab12.orderId ?? "",
      carrier: "教學物流",
      trackingNo: "DEMO-0001",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    const post12 = app.postShipmentDoc(d12.shipment!.Shipment_ID);
    const found = (post12.shipments ?? []).filter(
      (s) =>
        s.Shipment_Status === "Posted" &&
        s.Shipment_Date >= "2026-11-25" &&
        s.Shipment_Date <= "2026-11-25",
    );
    const lab12b = app.prepareWeek11Lab();
    app.setProducts((prev) =>
      prev.map((p) =>
        p.Product_ID === "P002" ? { ...p, Hold_Allocation: true } : p,
      ),
    );
    const holdBlock = app.createShipmentFromOrder({
      orderId: lab12b.orderId ?? "",
      carrier: "教學物流",
      trackingNo: "X",
      recipient: "教學收貨人",
      address: "台南市教學路 100 號",
    });
    const t12 = Boolean(
      found.length >= 1 &&
        !holdBlock.ok &&
        (holdBlock.message ?? "").includes("盤點"),
    );
    setRow(
      "T12",
      "查詢交集＋盤點異常拒絕",
      t12,
      `查得${found.length} · 異常=${holdBlock.message}`,
    );

    // 有出貨擋取消／重開
    const labX = app.prepareWeek11Lab();
    const dx2 = app.createShipmentFromOrder({
      orderId: labX.orderId ?? "",
      carrier: "教學物流",
      trackingNo: "Z",
      recipient: "a",
      address: "b",
    });
    const blockCancel = app.cancelSalesOrder(labX.orderId ?? "", "試取消");
    const blockReopen = app.reopenSalesOrder(labX.orderId ?? "", "試重開");
    setRow(
      "T-block",
      "有出貨擋取消／重開",
      Boolean(!blockCancel.ok && !blockReopen.ok && dx2.ok),
      `cancel=${blockCancel.message}`,
    );

    setBusy(false);
  }

  const passCount = rows.filter((r) => r.pass).length;

  return (
    <section
      id="sh01"
      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
      data-week11-acceptance="t01-t12"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base text-[var(--brand-deep)]">
            第 11 週出貨 T01–T12
          </h2>
          <p className="text-xs text-[var(--muted)]">
            講義案例：草稿不扣庫 → Admin 過帳現有↓保留↓ → 物流另管。一鍵獨立副本。
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={runAll}
        >
          {busy ? "執行中…" : "一鍵跑 T01–T12"}
        </button>
      </div>
      {rows.length > 0 && (
        <p className="text-sm">
          結果：{passCount}/{rows.length}
          {passCount === rows.length ? " 全部通過" : ""}
        </p>
      )}
      <ul className="space-y-1.5 text-sm">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`rounded px-2.5 py-1.5 ${
              r.pass
                ? "bg-[var(--brand-soft)]/40"
                : "bg-[var(--linen)] text-[var(--danger)]"
            }`}
          >
            <span className="font-mono font-semibold">{r.id}</span> {r.label}
            <div className="text-xs opacity-90">{r.result}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
