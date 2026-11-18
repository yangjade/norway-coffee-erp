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
      "01",
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
      "02",
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
      "03",
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
      "04",
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
      "05",
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
      "06",
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
      "07",
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
      "08",
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
      "09",
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
      "10",
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
      "11",
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
      "12",
      "Staff 過帳／盤點拒絕",
      Boolean(
        staffDraft.ok &&
          !staffPost.ok &&
          !staffSt.ok &&
          (staffPost.message ?? "").includes("管理者"),
      ),
      `post=${staffPost.message} · st=${staffSt.message}`,
    );

    setBusy(false);
  }

  return (
    <div
      className="space-y-3 border-t border-[var(--border)] px-4 py-4 sm:px-5"
      data-week10="acceptance-01-12"
      data-week10-marker="week10-inventory-20261118"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--brand)]">
          第 10 週驗收測試 01–12
        </p>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={busy}
          onClick={runAll}
        >
          {busy ? "測試中…" : "一鍵跑庫存 01–12"}
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
        會重設樣本並準備 P002／P011 期初。數量格式為 現有／保留／可用。確認只保留不扣現有。
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
