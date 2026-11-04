import { todayLocalDate } from "./quotation-rules";
import type {
  Product,
  Role,
  SalesOrder,
  SalesOrderDetail,
  StockMove,
} from "./types";

export type InventoryActionResult = {
  ok: boolean;
  message?: string;
  products?: Product[];
  moves?: StockMove[];
  order?: SalesOrder;
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

/** 揀貨檢核：回傳短缺列（不改狀態） */
export function previewShipStock(
  orderId: string,
  details: SalesOrderDetail[],
  products: Product[],
): { ok: boolean; shortages: string[]; lines: Array<{
  Product_ID: string;
  Qty: number;
  On_Hand: number;
  Unit: string;
  enough: boolean;
}> } {
  const lines = details.filter((d) => d.Order_ID === orderId);
  const byId = new Map(products.map((p) => [p.Product_ID, p]));
  const shortages: string[] = [];
  const preview = lines.map((line) => {
    const p = byId.get(line.Product_ID);
    const onHand = p?.On_Hand ?? 0;
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
  return { ok: shortages.length === 0 && lines.length > 0, shortages, lines: preview };
}

/** 出貨扣庫：訂單標為已出貨且尚未扣過 */
export function deductStockForShip(
  order: SalesOrder,
  details: SalesOrderDetail[],
  products: Product[],
  moves: StockMove[],
): InventoryActionResult {
  if (order.Stock_Deducted) {
    return {
      ok: true,
      message: "此訂單已扣過庫存。",
      products,
      moves,
      order,
    };
  }

  const lines = details.filter((d) => d.Order_ID === order.Order_ID);
  if (lines.length === 0) {
    return { ok: false, message: "訂單無明細，無法扣庫。" };
  }

  const nextProducts = products.map((p) => ({ ...p }));
  const byId = new Map(nextProducts.map((p) => [p.Product_ID, p]));
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
      message: `庫存不足，無法出貨：${shortages.join("；")}。請先調整庫存。`,
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

  for (const line of lines) {
    const p = byId.get(line.Product_ID)!;
    p.On_Hand -= line.Qty;
    seq += 1;
    newMoves.push({
      Move_ID: `M${String(base + seq).padStart(3, "0")}`,
      Product_ID: line.Product_ID,
      Qty: -line.Qty,
      Reason: "出貨扣庫",
      Ref_Order_ID: order.Order_ID,
      Move_Date: date,
      Note: `訂單 ${order.Order_ID} 出貨`,
    });
  }

  return {
    ok: true,
    message: `已扣庫存 ${lines.length} 項商品。`,
    products: nextProducts,
    moves: [...moves, ...newMoves],
    order: { ...order, Stock_Deducted: true, Order_Status: "已出貨" },
  };
}

/** 自已出貨改回其他狀態時還原庫存 */
export function restoreStockForUnship(
  order: SalesOrder,
  details: SalesOrderDetail[],
  products: Product[],
  moves: StockMove[],
): InventoryActionResult {
  if (!order.Stock_Deducted) {
    return {
      ok: true,
      message: "此訂單未扣庫，無需還原。",
      products,
      moves,
      order,
    };
  }

  const lines = details.filter((d) => d.Order_ID === order.Order_ID);
  const nextProducts = products.map((p) => ({ ...p }));
  const byId = new Map(nextProducts.map((p) => [p.Product_ID, p]));

  let seq = 0;
  const base = moves.reduce((m, x) => {
    const match = /^M(\d+)$/i.exec(x.Move_ID.trim());
    if (!match) return m;
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const newMoves: StockMove[] = [];
  const date = todayLocalDate();

  for (const line of lines) {
    const p = byId.get(line.Product_ID);
    if (!p) continue;
    p.On_Hand += line.Qty;
    seq += 1;
    newMoves.push({
      Move_ID: `M${String(base + seq).padStart(3, "0")}`,
      Product_ID: line.Product_ID,
      Qty: line.Qty,
      Reason: "取消還原",
      Ref_Order_ID: order.Order_ID,
      Move_Date: date,
      Note: `訂單 ${order.Order_ID} 取消出貨還原`,
    });
  }

  return {
    ok: true,
    message: "已還原庫存。",
    products: nextProducts,
    moves: [...moves, ...newMoves],
    order: { ...order, Stock_Deducted: false },
  };
}

/** Admin 手動調整現有量（可正可負增量） */
export function adjustOnHand(
  productId: string,
  delta: number,
  products: Product[],
  moves: StockMove[],
  role: Role,
  note?: string,
): InventoryActionResult {
  if (role !== "Admin") {
    return { ok: false, message: "僅管理者可手動調整庫存。" };
  }
  if (!Number.isInteger(delta) || delta === 0) {
    return { ok: false, message: "調整量須為非零整數。" };
  }
  const idx = products.findIndex((p) => p.Product_ID === productId);
  if (idx < 0) return { ok: false, message: "找不到該商品。" };
  const current = products[idx];
  const nextQty = current.On_Hand + delta;
  if (nextQty < 0) {
    return {
      ok: false,
      message: `調整後庫存不可為負（目前 ${current.On_Hand}）。`,
    };
  }
  const nextProducts = products.map((p, i) =>
    i === idx ? { ...p, On_Hand: nextQty } : p,
  );
  const move: StockMove = {
    Move_ID: nextMoveId(moves),
    Product_ID: productId,
    Qty: delta,
    Reason: "手動調整",
    Move_Date: todayLocalDate(),
    Note: note?.trim() || "手動調整現有量",
  };
  return {
    ok: true,
    message: `已調整 ${productId}：${delta > 0 ? "+" : ""}${delta} → ${nextQty}`,
    products: nextProducts,
    moves: [...moves, move],
  };
}
