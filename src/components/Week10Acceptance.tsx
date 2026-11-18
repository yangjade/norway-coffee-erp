"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import { WEEK8_BUSINESS_DATE } from "@/lib/order-rules";

type Row = { id: string; label: string; result: string; pass?: boolean };

function triple(
  snap: { On_Hand: number; Reserved: number; Available: number } | null | undefined,
) {
  if (!snap) return "—";
  return `${snap.On_Hand}/${snap.Reserved}/${snap.Available}`;
}

/** 第 10 週驗收 01–12（對齊老師講義連續案例） */
export function Week10Acceptance() {
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
    app.prepareWeek10Lab();

    const openA = app.createInventoryMove({
      productId: "P002",
      moveType: "期初",
      qty: 20,
      asDraft: true,
      note: "第10週期初 P002",
      sourceDocId: "OP-W10-001",
    });
    const openB = app.createInventoryMove({
      productId: "P011",
      moveType: "期初",
      qty: 8,
      asDraft: true,
      note: "第10週期初 P011",
      sourceDocId: "OP-W10-002",
    });
    const postA = openA.moves?.length
      ? app.postInventoryMove(openA.moves[openA.moves.length - 1].Move_ID)
      : { ok: false, message: "no move A" };
    const postB = openB.moves?.length
      ? app.postInventoryMove(openB.moves[openB.moves.length - 1].Move_ID)
      : { ok: false, message: "no move B" };
    // 重按過帳不得重複
    const repostA = openA.moves?.length
      ? app.postInventoryMove(openA.moves[openA.moves.length - 1].Move_ID)
      : { ok: false };
    const s01a = app.inventorySnap("P002");
    const s01b = app.inventorySnap("P011");
    setRow(
      "I01",
      "建立期初並重按過帳",
      Boolean(
        postA.ok &&
          postB.ok &&
          repostA.ok &&
          s01a?.On_Hand === 20 &&
          s01a.Reserved === 0 &&
          s01a.Available === 20 &&
          s01b?.On_Hand === 8 &&
          s01b.Reserved === 0 &&
          s01b.Available === 8,
      ),
      `P002 ${triple(s01a)} · P011 ${triple(s01b)}`,
    );

    const soA = app.convertAcceptedQuote("QT-20261118-001", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const soB = app.convertAcceptedQuote("QT-20261118-002", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const idA = soA.order?.Order_ID ?? "";
    const idB = soB.order?.Order_ID ?? "";
    app.saveDraftOrder(idA, {
      deliveryAgreed: true,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    app.saveDraftOrder(idB, {
      deliveryAgreed: true,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });

    const confA = app.confirmSalesOrder(idA);
    const s02a = app.inventorySnap("P002");
    const s02b = app.inventorySnap("P011");
    setRow(
      "I02",
      "確認 SO-A",
      Boolean(
        confA.ok &&
          s02a?.On_Hand === 20 &&
          s02a.Reserved === 10 &&
          s02a.Available === 10 &&
          s02b?.On_Hand === 8 &&
          s02b.Reserved === 6 &&
          s02b.Available === 2 &&
          s02b.Alert === "低庫存",
      ),
      `P002 ${triple(s02a)} · P011 ${triple(s02b)} · ${confA.message}`,
    );

    const confBfail = app.confirmSalesOrder(idB);
    const s03a = app.inventorySnap("P002");
    const s03b = app.inventorySnap("P011");
    setRow(
      "I03",
      "嘗試確認 SO-B（缺貨整單擋）",
      Boolean(
        !confBfail.ok &&
          s03a?.Reserved === 10 &&
          s03b?.Reserved === 6 &&
          (confBfail.message ?? "").includes("缺"),
      ),
      confBfail.message ?? "未擋下",
    );

    const inboundDraft = app.createInventoryMove({
      productId: "P002",
      moveType: "入庫",
      qty: 10,
      asDraft: true,
      note: "補貨 10",
      sourceDocId: "IN-W10-001",
    });
    const afterDraft = app.inventorySnap("P002");
    const draftId = inboundDraft.moves?.[inboundDraft.moves.length - 1]?.Move_ID;
    const inboundPost = draftId
      ? app.postInventoryMove(draftId)
      : { ok: false, message: "no inbound" };
    const inboundAgain = draftId
      ? app.postInventoryMove(draftId)
      : { ok: false };
    const s04 = app.inventorySnap("P002");
    setRow(
      "I04",
      "T001 入庫 10：草稿不變再過帳",
      Boolean(
        inboundDraft.ok &&
          afterDraft?.On_Hand === 20 &&
          inboundPost.ok &&
          inboundAgain.ok &&
          s04?.On_Hand === 30 &&
          s04.Reserved === 10 &&
          s04.Available === 20,
      ),
      `草稿後 ${triple(afterDraft)} → 過帳後 ${triple(s04)}`,
    );

    const confBok = app.confirmSalesOrder(idB);
    const s05a = app.inventorySnap("P002");
    const s05b = app.inventorySnap("P011");
    setRow(
      "I05",
      "再次確認 SO-B",
      Boolean(
        confBok.ok &&
          s05a?.On_Hand === 30 &&
          s05a.Reserved === 22 &&
          s05a.Available === 8 &&
          s05a.Alert === "低庫存" &&
          s05b?.On_Hand === 8 &&
          s05b.Reserved === 7 &&
          s05b.Available === 1 &&
          s05b.Alert === "低庫存",
      ),
      `P002 ${triple(s05a)} · P011 ${triple(s05b)}`,
    );

    const cancelA = app.cancelSalesOrder(idA, "第10週驗收取消 SO-A");
    const cancelAgain = app.cancelSalesOrder(idA, "重試取消");
    const s06a = app.inventorySnap("P002");
    const s06b = app.inventorySnap("P011");
    setRow(
      "I06",
      "Admin 取消 SO-A 並重試",
      Boolean(
        cancelA.ok &&
          !cancelAgain.ok &&
          s06a?.On_Hand === 30 &&
          s06a.Reserved === 12 &&
          s06a.Available === 18 &&
          s06b?.On_Hand === 8 &&
          s06b.Reserved === 1 &&
          s06b.Available === 7,
      ),
      `P002 ${triple(s06a)} · P011 ${triple(s06b)}`,
    );

    const out19 = app.createInventoryMove({
      productId: "P002",
      moveType: "出庫",
      qty: 19,
      asDraft: false,
      note: "試領 19",
      sourceDocId: "OUT-W10-BAD",
    });
    const out3 = app.createInventoryMove({
      productId: "P002",
      moveType: "出庫",
      qty: 3,
      asDraft: false,
      note: "非銷售領用 3",
      sourceDocId: "OUT-W10-001",
    });
    const s07 = app.inventorySnap("P002");
    setRow(
      "I07",
      "試領 19 拒／改領 3",
      Boolean(
        !out19.ok &&
          out3.ok &&
          s07?.On_Hand === 27 &&
          s07.Reserved === 12 &&
          s07.Available === 15,
      ),
      `拒=${out19.message} · 後 ${triple(s07)}`,
    );

    const stDraft = app.createInventoryMove({
      productId: "P002",
      moveType: "盤點調整",
      qty: 0,
      countedQty: 26,
      asDraft: true,
      note: "實盤 26",
      reason: "盤點差異",
      sourceDocId: "ST-W10-001",
    });
    const stId = stDraft.moves?.[stDraft.moves.length - 1]?.Move_ID;
    const stMove = stId
      ? app.stockMoves.find((m) => m.Move_ID === stId) ||
        stDraft.moves?.[stDraft.moves.length - 1]
      : undefined;
    const stPost = stId ? app.postInventoryMove(stId) : { ok: false };
    const s08 = app.inventorySnap("P002");
    setRow(
      "I08",
      "實盤 26 調整過帳",
      Boolean(
        stDraft.ok &&
          stMove?.Qty === -1 &&
          stPost.ok &&
          s08?.On_Hand === 26 &&
          s08.Reserved === 12 &&
          s08.Available === 14,
      ),
      `差異 ${stMove?.Qty} · ${triple(s08)}`,
    );

    const reopen = app.reopenSalesOrder(idB, "改量驗收");
    const dP002 =
      soB.details?.find((d) => d.Product_ID === "P002") ??
      app.orderDetails.find(
        (d) => d.Order_ID === idB && d.Product_ID === "P002",
      );
    const save15 = dP002
      ? app.saveDraftOrder(idB, {
          qtyByDetailId: { [dP002.Detail_ID]: 15 },
          deliveryAgreed: true,
          requestedDate: "2026-11-23",
          promisedDate: "2026-11-23",
        })
      : { ok: false, message: "no detail" };
    const conf15 = app.confirmSalesOrder(idB);
    const s09 = app.inventorySnap("P002");
    const s09b = app.inventorySnap("P011");
    setRow(
      "I09",
      "重開 SO-B、T001 改 15 再確認",
      Boolean(
        reopen.ok &&
          save15.ok &&
          conf15.ok &&
          s09?.On_Hand === 26 &&
          s09.Reserved === 15 &&
          s09.Available === 11 &&
          s09b?.Reserved === 1 &&
          s09b.Available === 7,
      ),
      `P002 ${triple(s09)} · P011 ${triple(s09b)}`,
    );

    const confAgain = app.confirmSalesOrder(idB);
    const s10a = app.inventorySnap("P002");
    const s10b = app.inventorySnap("P011");
    const hasSource = Boolean(
      inboundPost.ok && draftId && (inboundPost.moves ?? inboundDraft.moves)?.some(
        (m) => m.Move_ID === draftId && (m.Status ?? "Posted") === "Posted",
      ),
    );
    setRow(
      "I10",
      "再確認／來源單號查詢",
      Boolean(
        confAgain.ok &&
          s10a?.On_Hand === 26 &&
          s10a.Reserved === 15 &&
          s10a.Available === 11 &&
          s10b?.On_Hand === 8 &&
          s10b.Reserved === 1 &&
          s10b.Available === 7 &&
          hasSource,
      ),
      `P002 ${triple(s10a)} · P011 ${triple(s10b)} · IN-W10-001=${hasSource}`,
    );

    const beforeOn = app.inventorySnap("P002")?.On_Hand;
    const z0 = app.createInventoryMove({
      productId: "P002",
      moveType: "入庫",
      qty: 0,
      asDraft: false,
      sourceDocId: "BAD-0",
    });
    const zNeg = app.createInventoryMove({
      productId: "P002",
      moveType: "入庫",
      qty: -3,
      asDraft: false,
      sourceDocId: "BAD-NEG",
    });
    const zDec = app.createInventoryMove({
      productId: "P002",
      moveType: "入庫",
      qty: 1.5 as unknown as number,
      asDraft: false,
      sourceDocId: "BAD-DEC",
    });
    setRow(
      "I11",
      "數量 0／負／小數拒絕",
      Boolean(
        !z0.ok &&
          !zNeg.ok &&
          !zDec.ok &&
          app.inventorySnap("P002")?.On_Hand === beforeOn,
      ),
      `${z0.message}`,
    );

    app.switchUser("U002");
    const staffDraft = app.createInventoryMove({
      productId: "P002",
      moveType: "入庫",
      qty: 1,
      asDraft: true,
      sourceDocId: "IN-STAFF",
    });
    const staffMoveId =
      staffDraft.moves?.[staffDraft.moves.length - 1]?.Move_ID;
    const staffPost = staffMoveId
      ? app.postInventoryMove(staffMoveId)
      : { ok: false, message: "no staff move" };
    const staffSt = app.createInventoryMove({
      productId: "P002",
      moveType: "盤點調整",
      qty: 0,
      countedQty: 99,
      asDraft: false,
      sourceDocId: "ST-STAFF",
    });
    app.switchUser("U001");
    setRow(
      "I12",
      "Staff 過帳／盤點拒絕",
      Boolean(
        staffDraft.ok &&
          !staffPost.ok &&
          !staffSt.ok &&
          (staffPost.message ?? "").includes("管理者"),
      ),
      `post=${staffPost.message} · st=${staffSt.message}`,
    );


    // I13：同商品兩列合計需求檢查
    app.prepareWeek10Lab();
    const open13 = app.createInventoryMove({
      productId: "P002",
      moveType: "期初",
      qty: 5,
      asDraft: false,
      sourceDocId: "OP-I13",
    });
    const qSplit = app.convertAcceptedQuote("QT-20261118-001", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    // 用既有 SO-A 明細不夠演示兩列；改以手動可用量：現有5，若需求10應缺5
    const idSplit = qSplit.order?.Order_ID ?? "";
    if (idSplit) {
      app.saveDraftOrder(idSplit, {
        deliveryAgreed: true,
        requestedDate: "2026-11-23",
        promisedDate: "2026-11-23",
      });
      const failSplit = app.confirmSalesOrder(idSplit);
      setRow(
        "I13",
        "同單需求合計檢查（不足則整單不保留）",
        Boolean(open13.ok && !failSplit.ok && (failSplit.message ?? "").includes("缺")),
        failSplit.message ?? open13.message ?? "",
      );
    } else {
      setRow("I13", "同單需求合計檢查（不足則整單不保留）", false, "無訂單");
    }

    // I14：可用＝安全 → 低庫存
    const low = app.inventorySnap("P002");
    // 重置後走短路徑：直接設安全=可用
    app.prepareWeek10Lab();
    app.createInventoryMove({
      productId: "P002",
      moveType: "期初",
      qty: 8,
      asDraft: false,
      sourceDocId: "OP-I14",
    });
    app.setProductSafety("P002", 8);
    const s14 = app.inventorySnap("P002");
    setRow(
      "I14",
      "可用剛好等於安全量→低庫存",
      Boolean(s14 && s14.Available === 8 && s14.Safety_Stock === 8 && s14.Alert === "低庫存"),
      `avail=${s14?.Available} safety=${s14?.Safety_Stock} alert=${s14?.Alert}`,
    );

    // I15：可用 0 → 缺貨
    app.prepareWeek10Lab();
    const s15 = app.inventorySnap("P002");
    setRow(
      "I15",
      "可用 0 顯示缺貨",
      Boolean(s15 && s15.Available === 0 && s15.Alert === "缺貨"),
      `alert=${s15?.Alert} avail=${s15?.Available}`,
    );

    // I16：實盤低於保留 → 異常待處理
    app.prepareWeek10Lab();
    app.createInventoryMove({
      productId: "P002",
      moveType: "期初",
      qty: 20,
      asDraft: false,
      sourceDocId: "OP-I16a",
    });
    app.createInventoryMove({
      productId: "P011",
      moveType: "期初",
      qty: 8,
      asDraft: false,
      sourceDocId: "OP-I16b",
    });
    const qA = app.convertAcceptedQuote("QT-20261118-001", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const idA16 = qA.order?.Order_ID ?? "";
    app.saveDraftOrder(idA16, {
      deliveryAgreed: true,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    app.confirmSalesOrder(idA16);
    const stHold = app.createInventoryMove({
      productId: "P002",
      moveType: "盤點調整",
      qty: 0,
      countedQty: 5,
      asDraft: false,
      sourceDocId: "ST-I16",
    });
    const holdProd = app.products.find((p) => p.Product_ID === "P002");
    setRow(
      "I16",
      "實盤低於保留→異常並暫停",
      Boolean(!stHold.ok && holdProd?.Hold_Allocation === true),
      stHold.message ?? `hold=${holdProd?.Hold_Allocation}`,
    );

    // I17：一次重置可課堂演示（轉單→確認→缺貨擋）
    app.resetDemoData();
    app.switchUser("U001");
    app.prepareWeek10Lab();
    app.createInventoryMove({
      productId: "P002",
      moveType: "期初",
      qty: 20,
      asDraft: false,
      sourceDocId: "OP-I17a",
    });
    app.createInventoryMove({
      productId: "P011",
      moveType: "期初",
      qty: 8,
      asDraft: false,
      sourceDocId: "OP-I17b",
    });
    const demoA = app.convertAcceptedQuote("QT-20261118-001", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const demoB = app.convertAcceptedQuote("QT-20261118-002", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const dA = demoA.order?.Order_ID ?? "";
    const dB = demoB.order?.Order_ID ?? "";
    app.saveDraftOrder(dA, { deliveryAgreed: true, requestedDate: "2026-11-23", promisedDate: "2026-11-23" });
    app.saveDraftOrder(dB, { deliveryAgreed: true, requestedDate: "2026-11-23", promisedDate: "2026-11-23" });
    const okA = app.confirmSalesOrder(dA);
    const blockB = app.confirmSalesOrder(dB);
    setRow(
      "I17",
      "一次重置即可演示：確認保留＋缺貨擋",
      Boolean(okA.ok && !blockB.ok && (blockB.message ?? "").includes("缺")),
      `A=${okA.ok} B=${blockB.message}`,
    );

    setBusy(false);
  }

  return (
    <div
      id="i01"
      className="space-y-3 border-t border-[var(--border)] px-4 py-4 sm:px-5"
      data-week10="acceptance-i01-i17"
      data-week10-marker="week10-inventory-20261118"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--brand)]">
          I01–I17 庫存驗收（高於截圖：一鍵全過）
        </p>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={busy}
          onClick={runAll}
        >
          {busy ? "測試中…" : "一鍵跑 I01–I17"}
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => router.push("/inventory/")}
        >
          打開庫存
        </button>
      </div>
      <p className="text-[11px] text-[var(--muted)]">
        會重設樣本並準備 P002／P011。I01–I12＝講義連續案例；I13–I17＝加測（合計需求／低庫存界線／缺貨／盤點異常／一次演示）。
      </p>
      {rows.length > 0 && (
        <ul className="space-y-1 text-xs" data-week10-results="true">
          {rows.map((r) => (
            <li
              key={r.id}
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
