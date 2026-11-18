import { todayLocalDate } from "./quotation-rules";
import {
  confirmOrder as confirmOrderBase,
  statusLabelZh,
  validateConfirm,
} from "./order-rules";
import type {
  Product,
  Role,
  SalesOrder,
  SalesOrderDetail,
  StockAlert,
  StockMove,
  StockMoveType,
  StockReservation,
  WarehouseId,
} from "./types";
import { WAREHOUSE_ID } from "./types";

export type ShortageLine = {
  Product_ID: string;
  Product_Name?: string;
  Demand: number;
  Available: number;
  Shortage: number;
  Unit: string;
};

export type InventoryActionResult = {
  ok: boolean;
  message?: string;
  products?: Product[];
  moves?: StockMove[];
  reservations?: StockReservation[];
  order?: SalesOrder;
  shortages?: ShortageLine[];
};

export type InventoryRow = {
  Product_ID: string;
  Product_Name: string;
  Unit: string;
  Warehouse_ID: WarehouseId;
  On_Hand: number;
  Reserved: number;
  Available: number;
  Safety_Stock: number;
  Alert: StockAlert;
  Hold_Allocation: boolean;
};

export function nextMoveId(moves: StockMove[]): string {
  let max = 0;
  for (const m of moves) {
    const match = /^M(\d+)$/i.exec(m.Move_ID.trim());
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `M${String(max + 1).padStart(3, "0")}`;
}

export function nextReserveId(reserves: StockReservation[]): string {
  let max = 0;
  for (const r of reserves) {
    const match = /^R(\d+)$/i.exec(r.Reserve_ID.trim());
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `R${String(max + 1).padStart(3, "0")}`;
}

export function nextSourceDocId(moves: StockMove[], prefix: string): string {
  let max = 0;
  const re = new RegExp(`^${prefix}(\\d+)$`, "i");
  for (const m of moves) {
    const id = m.Source_Doc_ID ?? "";
    const match = re.exec(id.trim());
    if (match) {
      const n = Number.parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function moveTypeOf(m: StockMove): StockMoveType {
  return m.Move_Type ?? (m.Reason as StockMoveType);
}

export function isPosted(m: StockMove): boolean {
  return (m.Status ?? "Posted") === "Posted";
}

/** 現有量＝已過帳實體異動加總（不含保留） */
export function computeOnHand(
  productId: string,
  moves: StockMove[],
  warehouse: WarehouseId = WAREHOUSE_ID,
): number {
  let sum = 0;
  for (const m of moves) {
    if (!isPosted(m)) continue;
    if (m.Product_ID !== productId) continue;
    if ((m.Warehouse_ID ?? WAREHOUSE_ID) !== warehouse) continue;
    sum += m.Qty;
  }
  return sum;
}

/** 保留量＝有效訂單保留加總 */
export function computeReserved(
  productId: string,
  reservations: StockReservation[],
  warehouse: WarehouseId = WAREHOUSE_ID,
): number {
  let sum = 0;
  for (const r of reservations) {
    if (!r.Is_Active) continue;
    if (r.Product_ID !== productId) continue;
    if (r.Warehouse_ID !== warehouse) continue;
    sum += r.Qty;
  }
  return sum;
}

export function computeAvailable(onHand: number, reserved: number): number {
  return onHand - reserved;
}

export function computeShortage(demand: number, available: number): number {
  return Math.max(0, demand - available);
}

export function stockAlert(
  available: number,
  safetyStock: number,
): StockAlert {
  if (available <= 0) return "缺貨";
  if (available <= safetyStock) return "低庫存";
  return "正常";
}

/** 過帳時以有號數量更新商品現有量快取 */
export function applyOnHandDelta(
  products: Product[],
  productId: string,
  qtySigned: number,
): Product[] {
  return products.map((p) =>
    p.Product_ID === productId
      ? { ...p, On_Hand: p.On_Hand + qtySigned }
      : p,
  );
}

/** @deprecated 改用商品 On_Hand 快取＋過帳增量 */
export function syncProductOnHand(
  products: Product[],
  moves: StockMove[],
): Product[] {
  void moves;
  return products;
}

export function buildInventoryRows(
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[],
): InventoryRow[] {
  void moves;
  return products
    .filter((p) => p.Is_Active || p.On_Hand > 0 || computeReserved(p.Product_ID, reservations) > 0)
    .map((p) => {
      const onHand = p.On_Hand;
      const reserved = computeReserved(p.Product_ID, reservations);
      const available = computeAvailable(onHand, reserved);
      const safety = p.Safety_Stock ?? 0;
      return {
        Product_ID: p.Product_ID,
        Product_Name: p.Product_Name,
        Unit: p.Unit,
        Warehouse_ID: WAREHOUSE_ID,
        On_Hand: onHand,
        Reserved: reserved,
        Available: available,
        Safety_Stock: safety,
        Alert: stockAlert(available, safety),
        Hold_Allocation: Boolean(p.Hold_Allocation),
      };
    })
    .sort((a, b) => a.Product_ID.localeCompare(b.Product_ID));
}

export function getInventorySnapshot(
  productId: string,
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[],
): InventoryRow | null {
  void moves;
  const p = products.find((x) => x.Product_ID === productId);
  if (!p) return null;
  const onHand = p.On_Hand;
  const reserved = computeReserved(productId, reservations);
  const available = computeAvailable(onHand, reserved);
  const safety = p.Safety_Stock ?? 0;
  return {
    Product_ID: p.Product_ID,
    Product_Name: p.Product_Name,
    Unit: p.Unit,
    Warehouse_ID: WAREHOUSE_ID,
    On_Hand: onHand,
    Reserved: reserved,
    Available: available,
    Safety_Stock: safety,
    Alert: stockAlert(available, safety),
    Hold_Allocation: Boolean(p.Hold_Allocation),
  };
}

/** 整單依商品加總需求（同商品多列合計） */
export function aggregateOrderDemand(
  details: SalesOrderDetail[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of details) {
    map.set(d.Product_ID, (map.get(d.Product_ID) ?? 0) + d.Qty);
  }
  return map;
}

export function checkOrderAvailability(
  details: SalesOrderDetail[],
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[],
): { ok: boolean; shortages: ShortageLine[]; message?: string } {
  const demand = aggregateOrderDemand(details);
  const shortages: ShortageLine[] = [];
  const byId = new Map(products.map((p) => [p.Product_ID, p]));

  for (const [productId, qty] of demand) {
    const p = byId.get(productId);
    if (!p) {
      shortages.push({
        Product_ID: productId,
        Demand: qty,
        Available: 0,
        Shortage: qty,
        Unit: "",
      });
      continue;
    }
    if (p.Hold_Allocation) {
      shortages.push({
        Product_ID: productId,
        Product_Name: p.Product_Name,
        Demand: qty,
        Available: 0,
        Shortage: qty,
        Unit: p.Unit,
      });
      continue;
    }
    const onHand = p.On_Hand;
    const reserved = computeReserved(productId, reservations);
    const available = computeAvailable(onHand, reserved);
    const shortage = computeShortage(qty, available);
    if (shortage > 0) {
      shortages.push({
        Product_ID: productId,
        Product_Name: p.Product_Name,
        Demand: qty,
        Available: available,
        Shortage: shortage,
        Unit: p.Unit,
      });
    }
  }

  if (shortages.length === 0) return { ok: true, shortages: [] };

  const lines = shortages.map((s) => {
    const name = s.Product_Name ? `${s.Product_ID} ${s.Product_Name}` : s.Product_ID;
    return `${name}：要 ${s.Demand}${s.Unit}，可用只有 ${s.Available}${s.Unit}，缺 ${s.Shortage}${s.Unit}`;
  });
  return {
    ok: false,
    shortages,
    message: `庫存不足，整張訂單維持草稿、不會保留任何商品。${lines.join("；")}。`,
  };
}

function activeReservesForOrder(
  orderId: string,
  reservations: StockReservation[],
): StockReservation[] {
  return reservations.filter((r) => r.Order_ID === orderId && r.Is_Active);
}

/** 確認草稿：整單檢查、整單保留；現有量不變 */
export function confirmOrderWithReserve(
  order: SalesOrder,
  details: SalesOrderDetail[],
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[],
): InventoryActionResult {
  if (order.Order_Status === "Confirmed") {
    const existing = activeReservesForOrder(order.Order_ID, reservations);
    if (existing.length > 0) {
      return {
        ok: true,
        message: "訂單已確認，沿用既有保留（不重複增加）。",
        order,
        products,
        moves,
        reservations,
      };
    }
  }

  const base = confirmOrderBase(order, details);
  if (!base.ok || !base.order) {
    return { ok: false, message: base.message };
  }

  const check = checkOrderAvailability(
    details,
    products,
    moves,
    reservations,
  );
  if (!check.ok) {
    return {
      ok: false,
      message: check.message,
      shortages: check.shortages,
      order,
      products,
      moves,
      reservations,
    };
  }

  const errors = validateConfirm(order, details);
  if (errors.length) {
    return { ok: false, message: `無法確認：${errors.join("；")}` };
  }

  const now = new Date().toISOString();
  let seq = 0;
  const baseId = reservations.reduce((m, r) => {
    const match = /^R(\d+)$/i.exec(r.Reserve_ID.trim());
    if (!match) return m;
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);

  const newReserves: StockReservation[] = details.map((d) => {
    seq += 1;
    return {
      Reserve_ID: `R${String(baseId + seq).padStart(3, "0")}`,
      Order_ID: order.Order_ID,
      Detail_ID: d.Detail_ID,
      Product_ID: d.Product_ID,
      Warehouse_ID: WAREHOUSE_ID,
      Qty: d.Qty,
      Is_Active: true,
      Created_At: now,
    };
  });

  return {
    ok: true,
    message: `訂單已確認並保留庫存（現有量不變；保留↑ 可用↓）。共 ${newReserves.length} 筆保留。`,
    order: { ...order, Order_Status: "Confirmed" },
    products,
    moves,
    reservations: [...reservations, ...newReserves],
  };
}

/** 取消／重開：解除該單全部有效保留；現有量不變 */
export function releaseOrderReserves(
  orderId: string,
  reservations: StockReservation[],
): { reservations: StockReservation[]; releasedQty: number } {
  const now = new Date().toISOString();
  let releasedQty = 0;
  const next = reservations.map((r) => {
    if (r.Order_ID !== orderId || !r.Is_Active) return r;
    releasedQty += r.Qty;
    return { ...r, Is_Active: false, Released_At: now };
  });
  return { reservations: next, releasedQty };
}

/** 揀貨檢核（第 11 週出貨用）：看現有量是否夠出已保留量 */
export function previewShipStock(
  orderId: string,
  details: SalesOrderDetail[],
  products: Product[],
  moves?: StockMove[],
): {
  ok: boolean;
  shortages: string[];
  lines: Array<{
    Product_ID: string;
    Qty: number;
    On_Hand: number;
    Unit: string;
    enough: boolean;
  }>;
} {
  const lines = details.filter((d) => d.Order_ID === orderId);
  const byId = new Map(products.map((p) => [p.Product_ID, p]));
  const shortages: string[] = [];
  const preview = lines.map((line) => {
    const p = byId.get(line.Product_ID);
    const onHand = moves
      ? computeOnHand(line.Product_ID, moves)
      : (p?.On_Hand ?? 0);
    const unit = p?.Unit ?? "";
    const enough = Boolean(p) && onHand >= line.Qty;
    if (!p) {
      shortages.push(`${line.Product_ID} 找不到商品`);
    } else if (!enough) {
      shortages.push(
        `${p.Product_ID} 現有 ${onHand}${unit}，需求 ${line.Qty}`,
      );
    }
    return {
      Product_ID: line.Product_ID,
      Qty: line.Qty,
      On_Hand: onHand,
      Unit: unit,
      enough,
    };
  });
  return {
    ok: shortages.length === 0 && lines.length > 0,
    shortages,
    lines: preview,
  };
}

/** 出貨扣庫：現有↓、保留↓（第 11 週）；同時解除對應保留 */
export function deductStockForShip(
  order: SalesOrder,
  details: SalesOrderDetail[],
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[] = [],
): InventoryActionResult {
  if (order.Stock_Deducted) {
    return {
      ok: true,
      message: "此訂單已扣過庫存。",
      products,
      moves,
      reservations,
      order,
    };
  }

  const lines = details.filter((d) => d.Order_ID === order.Order_ID);
  if (lines.length === 0) {
    return { ok: false, message: "訂單無明細，無法扣庫。" };
  }

  const synced = products.map((p) => ({ ...p }));
  const byId = new Map(synced.map((p) => [p.Product_ID, p]));
  const shortages: string[] = [];

  for (const line of lines) {
    const p = byId.get(line.Product_ID);
    if (!p) {
      return {
        ok: false,
        message: `找不到商品 ${line.Product_ID}，無法扣庫。`,
      };
    }
    if (p.On_Hand < line.Qty) {
      shortages.push(
        `${p.Product_ID} 現有 ${p.On_Hand}${p.Unit}，需求 ${line.Qty}`,
      );
    }
  }
  if (shortages.length > 0) {
    return {
      ok: false,
      message: `庫存不足，無法出貨：${shortages.join("；")}。`,
    };
  }

  let seq = 0;
  const base = moves.reduce((m, x) => {
    const match = /^M(\d+)$/i.exec(x.Move_ID.trim());
    if (!match) return m;
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const newMoves: StockMove[] = [];
  const date = todayLocalDate();
  const postedAt = new Date().toISOString();

  let nextProducts = synced;
  for (const line of lines) {
    seq += 1;
    nextProducts = applyOnHandDelta(nextProducts, line.Product_ID, -line.Qty);
    newMoves.push({
      Move_ID: `M${String(base + seq).padStart(3, "0")}`,
      Product_ID: line.Product_ID,
      Warehouse_ID: WAREHOUSE_ID,
      Move_Type: "出貨扣庫",
      Qty: -line.Qty,
      Status: "Posted",
      Source_Doc_ID: order.Order_ID,
      Source_Line_No: seq,
      Reason: "出貨扣庫",
      Ref_Order_ID: order.Order_ID,
      Move_Date: date,
      Posted_At: postedAt,
      Note: `訂單 ${order.Order_ID} 出貨`,
    });
  }

  const { reservations: nextReserves } = releaseOrderReserves(
    order.Order_ID,
    reservations,
  );
  const nextMoves = [...moves, ...newMoves];

  return {
    ok: true,
    message: `已出貨扣庫 ${lines.length} 項（現有↓ 保留↓）。`,
    products: nextProducts,
    moves: nextMoves,
    reservations: nextReserves,
    order: { ...order, Stock_Deducted: true },
  };
}

export function restoreStockForUnship(
  order: SalesOrder,
  details: SalesOrderDetail[],
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[] = [],
): InventoryActionResult {
  if (!order.Stock_Deducted) {
    return {
      ok: true,
      message: "此訂單未扣庫，無需還原。",
      products,
      moves,
      reservations,
      order,
    };
  }

  const lines = details.filter((d) => d.Order_ID === order.Order_ID);
  let seq = 0;
  const base = moves.reduce((m, x) => {
    const match = /^M(\d+)$/i.exec(x.Move_ID.trim());
    if (!match) return m;
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const newMoves: StockMove[] = [];
  const date = todayLocalDate();
  const postedAt = new Date().toISOString();
  const now = new Date().toISOString();

  for (const line of lines) {
    seq += 1;
    newMoves.push({
      Move_ID: `M${String(base + seq).padStart(3, "0")}`,
      Product_ID: line.Product_ID,
      Warehouse_ID: WAREHOUSE_ID,
      Move_Type: "取消還原",
      Qty: line.Qty,
      Status: "Posted",
      Source_Doc_ID: order.Order_ID,
      Source_Line_No: seq,
      Reason: "取消還原",
      Ref_Order_ID: order.Order_ID,
      Move_Date: date,
      Posted_At: postedAt,
      Note: `訂單 ${order.Order_ID} 取消出貨還原`,
    });
  }

  // 還原保留（未出貨狀態）
  let rSeq = 0;
  const rBase = reservations.reduce((m, r) => {
    const match = /^R(\d+)$/i.exec(r.Reserve_ID.trim());
    if (!match) return m;
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const reReserve: StockReservation[] = lines.map((d) => {
    rSeq += 1;
    return {
      Reserve_ID: `R${String(rBase + rSeq).padStart(3, "0")}`,
      Order_ID: order.Order_ID,
      Detail_ID: d.Detail_ID,
      Product_ID: d.Product_ID,
      Warehouse_ID: WAREHOUSE_ID,
      Qty: d.Qty,
      Is_Active: true,
      Created_At: now,
    };
  });

  let nextProducts = products;
  for (const line of lines) {
    nextProducts = applyOnHandDelta(nextProducts, line.Product_ID, line.Qty);
  }
  const nextMoves = [...moves, ...newMoves];

  return {
    ok: true,
    message: "已取消出貨並還原現有量與保留。",
    products: nextProducts,
    moves: nextMoves,
    reservations: [...reservations, ...reReserve],
    order: { ...order, Stock_Deducted: false },
  };
}

function signedQtyForType(moveType: StockMoveType, absQty: number): number {
  if (moveType === "出庫" || moveType === "出貨扣庫") return -Math.abs(absQty);
  if (moveType === "盤點調整" || moveType === "更正" || moveType === "手動調整") {
    return absQty; // caller passes signed
  }
  return Math.abs(absQty);
}

export type CreateMoveInput = {
  productId: string;
  moveType: StockMoveType;
  /** 入／出庫輸正整數；盤點調整傳有號差異；更正傳有號 */
  qty: number;
  role: Role;
  note?: string;
  reason?: string;
  countedQty?: number;
  bookOnHand?: number;
  sourceDocId?: string;
  asDraft?: boolean;
};

/** 建立庫存異動（草稿或直接過帳） */
export function createStockMove(
  input: CreateMoveInput,
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[],
): InventoryActionResult {
  const {
    productId,
    moveType,
    qty,
    role,
    note,
    reason,
    countedQty,
    bookOnHand,
    asDraft = true,
  } = input;

  const product = products.find((p) => p.Product_ID === productId);
  if (!product) return { ok: false, message: "找不到該商品。" };

  if (moveType === "盤點調整" || moveType === "期初") {
    if (role !== "Admin") {
      return { ok: false, message: "僅管理者可過帳期初／盤點調整。" };
    }
  }

  let signed: number;
  if (moveType === "盤點調整") {
    if (countedQty == null || !Number.isInteger(countedQty) || countedQty < 0) {
      return { ok: false, message: "實盤量須為非負整數。" };
    }
    const book = bookOnHand ?? product.On_Hand;
    signed = countedQty - book;
    if (signed === 0) {
      return { ok: false, message: "差異為 0，不新增異動。" };
    }
  } else if (moveType === "更正" || moveType === "手動調整") {
    if (role !== "Admin") {
      return { ok: false, message: "僅管理者可手動調整／更正。" };
    }
    if (!Number.isInteger(qty) || qty === 0) {
      return { ok: false, message: "調整量須為非零整數。" };
    }
    signed = qty;
  } else {
    if (!Number.isInteger(qty) || qty <= 0) {
      return {
        ok: false,
        message: "數量須為大於 0 的整數（不可為 0、負數或小數）。",
      };
    }
    signed = signedQtyForType(moveType, qty);
  }

  if (moveType === "出庫") {
    const onHand = product.On_Hand;
    const reserved = computeReserved(productId, reservations);
    const available = computeAvailable(onHand, reserved);
    const need = Math.abs(signed);
    if (product.Hold_Allocation) {
      return { ok: false, message: "此商品盤點異常待處理，暫停出庫。" };
    }
    if (need > available) {
      return {
        ok: false,
        message: `一般出庫不可超過可用量（可用 ${available}${product.Unit}，要請領 ${need}${product.Unit}）。`,
      };
    }
  }

  const docId =
    input.sourceDocId ??
    nextSourceDocId(
      moves,
      moveType === "期初"
        ? "OP"
        : moveType === "入庫"
          ? "IN"
          : moveType === "出庫"
            ? "OUT"
            : moveType === "盤點調整"
              ? "ST"
              : "ADJ",
    );

  // 同單同列防重複：若已有 Posted 同 Source_Doc_ID + Line
  const dup = moves.some(
    (m) =>
      isPosted(m) &&
      m.Source_Doc_ID === docId &&
      (m.Source_Line_No ?? 1) === 1 &&
      m.Product_ID === productId,
  );
  if (dup && !asDraft) {
    return {
      ok: false,
      message: `來源單 ${docId} 已過帳，不可重複入帳。`,
      products,
      moves,
      reservations,
    };
  }

  const move: StockMove = {
    Move_ID: nextMoveId(moves),
    Product_ID: productId,
    Warehouse_ID: WAREHOUSE_ID,
    Move_Type: moveType,
    Qty: signed,
    Status: "Draft",
    Source_Doc_ID: docId,
    Source_Line_No: 1,
    Reason: moveType,
    Move_Date: todayLocalDate(),
    Note: note?.trim() || reason?.trim() || `${moveType} ${productId}`,
    Handled_By: role,
    Counted_Qty: countedQty,
    Book_On_Hand:
      moveType === "盤點調整"
        ? (bookOnHand ?? product.On_Hand)
        : undefined,
  };

  const nextMoves = [...moves, move];
  if (!asDraft) {
    return postStockMove(
      move.Move_ID,
      role,
      products,
      nextMoves,
      reservations,
    );
  }

  return {
    ok: true,
    message: `已存 ${moveType} 草稿 ${move.Move_ID}（現有量尚未變更）。`,
    products,
    moves: nextMoves,
    reservations,
  };
}

/** Admin 過帳草稿異動 */
export function postStockMove(
  moveId: string,
  role: Role,
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[],
): InventoryActionResult {
  if (role !== "Admin") {
    return {
      ok: false,
      message: "僅管理者可過帳庫存單／設定安全量／盤點調整。",
    };
  }
  const idx = moves.findIndex((m) => m.Move_ID === moveId);
  if (idx < 0) return { ok: false, message: "找不到該異動。" };
  const move = moves[idx];
  if (isPosted(move)) {
    return {
      ok: true,
      message: `異動 ${moveId} 已過帳，不重複入帳。`,
      products,
      moves,
      reservations,
    };
  }

  const product = products.find((p) => p.Product_ID === move.Product_ID);
  if (!product) return { ok: false, message: "找不到商品。" };

  const type = moveTypeOf(move);
  if (type === "出庫") {
    const onHand = product.On_Hand;
    const reserved = computeReserved(move.Product_ID, reservations);
    const available = computeAvailable(onHand, reserved);
    if (Math.abs(move.Qty) > available) {
      return {
        ok: false,
        message: `過帳失敗：出庫 ${Math.abs(move.Qty)} 超過可用 ${available}。`,
      };
    }
  }

  // 盤點：實盤低於保留 → 標記異常並暫停
  let nextProducts = products.map((p) => ({ ...p }));
  if (type === "盤點調整" && move.Counted_Qty != null) {
    const reserved = computeReserved(move.Product_ID, reservations);
    if (move.Counted_Qty < reserved) {
      nextProducts = nextProducts.map((p) =>
        p.Product_ID === move.Product_ID
          ? { ...p, Hold_Allocation: true }
          : p,
      );
      // 仍保存實盤與差異，但不完成調整（不過帳數量）
      const held = moves.map((m, i) =>
        i === idx
          ? {
              ...m,
              Note: `${m.Note ?? ""}｜實盤低於保留，待處理`.trim(),
              Status: "Draft" as const,
            }
          : m,
      );
      return {
        ok: false,
        message: `實盤 ${move.Counted_Qty} 低於保留 ${reserved}：已保存異常並暫停新保留／出庫，請管理者處理後再過帳。`,
        products: nextProducts,
        moves: held,
        reservations,
      };
    }
  }

  const dup = moves.some(
    (m, i) =>
      i !== idx &&
      isPosted(m) &&
      m.Source_Doc_ID &&
      m.Source_Doc_ID === move.Source_Doc_ID &&
      (m.Source_Line_No ?? 1) === (move.Source_Line_No ?? 1) &&
      m.Product_ID === move.Product_ID,
  );
  if (dup) {
    return {
      ok: false,
      message: `來源單 ${move.Source_Doc_ID} 同列已過帳，不可重複。`,
    };
  }

  const nextMoves = moves.map((m, i) =>
    i === idx
      ? { ...m, Status: "Posted" as const, Posted_At: new Date().toISOString() }
      : m,
  );
  nextProducts = applyOnHandDelta(nextProducts, move.Product_ID, move.Qty);

  const snap = getInventorySnapshot(
    move.Product_ID,
    nextProducts,
    nextMoves,
    reservations,
  );

  return {
    ok: true,
    message: `已過帳 ${moveId}（${type} ${move.Qty > 0 ? "+" : ""}${move.Qty}）。目前 ${move.Product_ID} 現有 ${snap?.On_Hand}／保留 ${snap?.Reserved}／可用 ${snap?.Available}。`,
    products: nextProducts,
    moves: nextMoves,
    reservations,
  };
}

export function setSafetyStock(
  productId: string,
  safety: number,
  products: Product[],
  role: Role,
): InventoryActionResult {
  if (role !== "Admin") {
    return { ok: false, message: "僅管理者可設定安全庫存。" };
  }
  if (!Number.isInteger(safety) || safety < 0) {
    return { ok: false, message: "安全庫存須為非負整數。" };
  }
  const idx = products.findIndex((p) => p.Product_ID === productId);
  if (idx < 0) return { ok: false, message: "找不到該商品。" };
  const next = products.map((p, i) =>
    i === idx ? { ...p, Safety_Stock: safety } : p,
  );
  return {
    ok: true,
    message: `已設定 ${productId} 安全庫存＝${safety}。`,
    products: next,
  };
}

/** Admin 手動調整（相容舊 API；寫入已過帳異動） */
export function adjustOnHand(
  productId: string,
  delta: number,
  products: Product[],
  moves: StockMove[],
  role: Role,
  note?: string,
  reservations: StockReservation[] = [],
): InventoryActionResult {
  return createStockMove(
    {
      productId,
      moveType: "手動調整",
      qty: delta,
      role,
      note,
      asDraft: false,
    },
    products,
    moves,
    reservations,
  );
}

export function formatShortagePlain(shortages: ShortageLine[]): string {
  if (!shortages.length) return "";
  return shortages
    .map((s) => {
      const name = s.Product_Name ?? s.Product_ID;
      return `「${name}」要 ${s.Demand}${s.Unit}，現在能用的只有 ${s.Available}${s.Unit}，還缺 ${s.Shortage}${s.Unit}`;
    })
    .join("；");
}

export function alertCounts(rows: InventoryRow[]): {
  low: number;
  out: number;
  normal: number;
} {
  let low = 0;
  let out = 0;
  let normal = 0;
  for (const r of rows) {
    if (r.Alert === "缺貨") out += 1;
    else if (r.Alert === "低庫存") low += 1;
    else normal += 1;
  }
  return { low, out, normal };
}

export { statusLabelZh };
