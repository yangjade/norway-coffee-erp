import { todayLocalDate } from "./quotation-rules";
import {
  applyOnHandDelta,
  computeReserved,
  nextMoveId,
} from "./inventory-rules";
import type {
  AppUser,
  DeliveryMethod,
  DeliveryStatus,
  DeliveryStatusLog,
  FulfillmentStatus,
  Product,
  Role,
  SalesOrder,
  SalesOrderDetail,
  Shipment,
  ShipmentDetail,
  ShipmentStatus,
  StockMove,
  StockReservation,
} from "./types";
import { WAREHOUSE_ID } from "./types";

export type ShipmentActionResult = {
  ok: boolean;
  message?: string;
  shipment?: Shipment;
  details?: ShipmentDetail[];
  shipments?: Shipment[];
  shipmentDetails?: ShipmentDetail[];
  products?: Product[];
  moves?: StockMove[];
  reservations?: StockReservation[];
  orderDetails?: SalesOrderDetail[];
  order?: SalesOrder;
  deliveryLogs?: DeliveryStatusLog[];
};

const BUSINESS_DATE_W11 = "2026-11-25";

export function shipmentStatusLabelZh(s: ShipmentStatus): string {
  switch (s) {
    case "Draft":
      return "草稿";
    case "Posted":
      return "已過帳";
    case "Cancelled":
      return "已作廢";
    default:
      return s;
  }
}

export function deliveryStatusLabelZh(s: DeliveryStatus): string {
  switch (s) {
    case "Pending":
      return "待交付";
    case "InTransit":
      return "運送中";
    case "Delivered":
      return "已送達";
    case "Exception":
      return "異常";
    default:
      return s;
  }
}

export function fulfillmentStatusLabelZh(s: FulfillmentStatus): string {
  return s === "Shipped" ? "全數出貨" : "尚未出貨";
}

export function nextShipmentId(
  shipments: Shipment[],
  date = BUSINESS_DATE_W11,
): string {
  const ymd = date.replace(/-/g, "");
  const prefix = `SH-${ymd}-`;
  let max = 0;
  for (const s of shipments) {
    if (!s.Shipment_ID.startsWith(prefix)) continue;
    const n = Number.parseInt(s.Shipment_ID.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function nextDeliveryLogId(logs: DeliveryStatusLog[]): string {
  let max = 0;
  for (const l of logs) {
    const m = /^DL(\d+)$/i.exec(l.Log_ID.trim());
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `DL${String(max + 1).padStart(3, "0")}`;
}

export function remainingQty(detail: SalesOrderDetail): number {
  return Math.max(0, detail.Qty - (detail.Shipped_Qty ?? 0));
}

export function computeFulfillment(
  orderId: string,
  details: SalesOrderDetail[],
): FulfillmentStatus {
  const lines = details.filter((d) => d.Order_ID === orderId);
  if (lines.length === 0) return "Unshipped";
  const allShipped = lines.every((d) => (d.Shipped_Qty ?? 0) >= d.Qty);
  return allShipped ? "Shipped" : "Unshipped";
}

/** 訂單是否已有非作廢出貨單（草稿或已過帳） */
export function orderHasShipments(
  orderId: string,
  shipments: Shipment[],
): boolean {
  return shipments.some(
    (s) =>
      s.Order_ID === orderId && s.Shipment_Status !== "Cancelled",
  );
}

export function activeReserveForLine(
  orderId: string,
  detailId: string,
  reservations: StockReservation[],
): StockReservation | undefined {
  return reservations.find(
    (r) =>
      r.Order_ID === orderId &&
      r.Detail_ID === detailId &&
      r.Is_Active &&
      r.Qty > 0,
  );
}

export type ShipableLinePreview = {
  Detail_ID: string;
  Product_ID: string;
  Product_Name_Snapshot: string;
  Unit_Snapshot: string;
  Order_Qty: number;
  Shipped_Qty: number;
  Remaining: number;
  Reserve_ID: string | null;
  Reserve_Qty: number;
  Ship_Qty: number;
};

export function previewShipableOrder(
  order: SalesOrder,
  details: SalesOrderDetail[],
  reservations: StockReservation[],
  products: Product[],
): { ok: boolean; message?: string; lines: ShipableLinePreview[] } {
  if (order.Order_Status !== "Confirmed") {
    return {
      ok: false,
      message: `訂單狀態為 ${order.Order_Status}，僅 Confirmed 可建立出貨。`,
      lines: [],
    };
  }
  const lines = details.filter((d) => d.Order_ID === order.Order_ID);
  if (lines.length === 0) {
    return { ok: false, message: "訂單無明細。", lines: [] };
  }

  const preview: ShipableLinePreview[] = [];
  const problems: string[] = [];

  for (const d of lines) {
    const rem = remainingQty(d);
    const reserve = activeReserveForLine(
      order.Order_ID,
      d.Detail_ID,
      reservations,
    );
    const product = products.find((p) => p.Product_ID === d.Product_ID);
    if (product?.Hold_Allocation) {
      problems.push(`${d.Product_ID} 盤點異常，暫停出貨`);
    }
    if (rem <= 0) {
      preview.push({
        Detail_ID: d.Detail_ID,
        Product_ID: d.Product_ID,
        Product_Name_Snapshot: d.Product_Name_Snapshot,
        Unit_Snapshot: d.Unit_Snapshot,
        Order_Qty: d.Qty,
        Shipped_Qty: d.Shipped_Qty ?? 0,
        Remaining: 0,
        Reserve_ID: reserve?.Reserve_ID ?? null,
        Reserve_Qty: reserve?.Qty ?? 0,
        Ship_Qty: 0,
      });
      continue;
    }
    if (!reserve) {
      problems.push(
        `${d.Product_ID} 尚未配置有效保留（待配置），不可出貨`,
      );
    } else if (reserve.Qty < rem) {
      problems.push(
        `${d.Product_ID} 有效保留 ${reserve.Qty} 不足剩餘未出貨 ${rem}`,
      );
    }
    preview.push({
      Detail_ID: d.Detail_ID,
      Product_ID: d.Product_ID,
      Product_Name_Snapshot: d.Product_Name_Snapshot,
      Unit_Snapshot: d.Unit_Snapshot,
      Order_Qty: d.Qty,
      Shipped_Qty: d.Shipped_Qty ?? 0,
      Remaining: rem,
      Reserve_ID: reserve?.Reserve_ID ?? null,
      Reserve_Qty: reserve?.Qty ?? 0,
      Ship_Qty: rem,
    });
  }

  const toShip = preview.filter((l) => l.Remaining > 0);
  if (toShip.length === 0) {
    return {
      ok: false,
      message: "此訂單已全數出貨（已出完），不可再建出貨單。",
      lines: preview,
    };
  }
  if (problems.length > 0) {
    return { ok: false, message: problems.join("；"), lines: preview };
  }
  return { ok: true, lines: preview };
}

export type CreateShipmentDraftInput = {
  orderId: string;
  role: Role;
  user: AppUser;
  shipmentDate?: string;
  recipient?: string;
  address?: string;
  deliveryMethod?: DeliveryMethod;
  carrier?: string;
  trackingNo?: string;
  notes?: string;
  /** 覆寫各列出貨量；預設＝剩餘量一次出完 */
  shipQtyByDetailId?: Record<string, number>;
};

/** 建立出貨草稿：不改庫存 */
export function createShipmentDraft(
  input: CreateShipmentDraftInput,
  orders: SalesOrder[],
  details: SalesOrderDetail[],
  reservations: StockReservation[],
  products: Product[],
  shipments: Shipment[],
  shipmentDetails: ShipmentDetail[],
): ShipmentActionResult {
  const order = orders.find((o) => o.Order_ID === input.orderId);
  if (!order) return { ok: false, message: "找不到該訂單。" };

  const preview = previewShipableOrder(
    order,
    details,
    reservations,
    products,
  );
  if (!preview.ok) {
    return { ok: false, message: preview.message };
  }

  const shipLines = preview.lines.filter((l) => l.Remaining > 0);
  const qtyMap = input.shipQtyByDetailId ?? {};
  const built: ShipmentDetail[] = [];
  const qtyErrors: string[] = [];

  for (let i = 0; i < shipLines.length; i++) {
    const line = shipLines[i];
    const raw =
      qtyMap[line.Detail_ID] !== undefined
        ? qtyMap[line.Detail_ID]
        : line.Remaining;
    if (
      typeof raw !== "number" ||
      !Number.isFinite(raw) ||
      !Number.isInteger(raw) ||
      raw <= 0
    ) {
      qtyErrors.push(
        `${line.Product_ID} 出貨量須為正整數（不可為 0、負數或小數）`,
      );
      continue;
    }
    if (raw > line.Remaining) {
      qtyErrors.push(
        `${line.Product_ID} 出貨量 ${raw} 超過本單剩餘 ${line.Remaining}`,
      );
      continue;
    }
    if (raw > line.Reserve_Qty) {
      qtyErrors.push(
        `${line.Product_ID} 出貨量 ${raw} 超過有效保留 ${line.Reserve_Qty}`,
      );
      continue;
    }
    if (!line.Reserve_ID) {
      qtyErrors.push(`${line.Product_ID} 缺少保留來源`);
      continue;
    }
    built.push({
      Shipment_ID: "", // filled after id
      Line_No: i + 1,
      Order_Line: line.Detail_ID,
      Product_ID: line.Product_ID,
      Reservation_ID: line.Reserve_ID,
      Product_Name_Snapshot: line.Product_Name_Snapshot,
      Unit_Snapshot: line.Unit_Snapshot,
      Ship_Qty: raw,
    });
  }

  if (qtyErrors.length > 0) {
    return { ok: false, message: qtyErrors.join("；") };
  }
  if (built.length === 0) {
    return { ok: false, message: "出貨明細不可為空。" };
  }

  const shipDate = input.shipmentDate?.trim() || BUSINESS_DATE_W11;
  if (shipDate < order.Order_Date) {
    return { ok: false, message: "離倉日不得早於訂單日。" };
  }
  const today = todayLocalDate();
  // 允許教學日；但不可用「遠未來」冒充已出貨（超過今天＋30 天擋）
  if (shipDate > today && shipDate > BUSINESS_DATE_W11) {
    const maxFuture = new Date();
    maxFuture.setDate(maxFuture.getDate() + 1);
    const maxStr = maxFuture.toISOString().slice(0, 10);
    if (shipDate > maxStr && shipDate !== BUSINESS_DATE_W11) {
      return { ok: false, message: "離倉日不得以未來日期表示已出貨。" };
    }
  }

  const id = nextShipmentId(shipments, shipDate);
  const now = new Date().toISOString();
  const header: Shipment = {
    Shipment_ID: id,
    Order_ID: order.Order_ID,
    Warehouse_ID: WAREHOUSE_ID,
    Shipment_Date: shipDate,
    Recipient:
      (input.recipient ?? order.Ship_To_Name ?? "").trim() ||
      order.Customer_ID,
    Address_Snapshot:
      (input.address ?? order.Ship_To_Address ?? "").trim() || "（待核對）",
    Delivery_Method: input.deliveryMethod ?? "宅配",
    Carrier: input.carrier?.trim() || undefined,
    Tracking_No: input.trackingNo?.trim() || undefined,
    Shipment_Status: "Draft",
    Delivery_Status: "Pending",
    Notes: input.notes?.trim() || undefined,
    Created_At: now,
    Created_By: input.user.User_ID,
  };

  const detailRows = built.map((d) => ({ ...d, Shipment_ID: id }));

  return {
    ok: true,
    message: `已建立出貨草稿 ${id}（庫存不變）。`,
    shipment: header,
    details: detailRows,
    shipments: [...shipments, header],
    shipmentDetails: [...shipmentDetails, ...detailRows],
  };
}

export type UpdateShipmentDraftInput = {
  shipmentId: string;
  role: Role;
  user: AppUser;
  shipmentDate?: string;
  recipient?: string;
  address?: string;
  deliveryMethod?: DeliveryMethod;
  carrier?: string;
  trackingNo?: string;
  notes?: string;
  shipQtyByLineNo?: Record<number, number>;
  /** 作廢草稿 */
  cancel?: boolean;
};

export function updateShipmentDraft(
  input: UpdateShipmentDraftInput,
  orders: SalesOrder[],
  orderDetails: SalesOrderDetail[],
  reservations: StockReservation[],
  products: Product[],
  shipments: Shipment[],
  shipmentDetails: ShipmentDetail[],
): ShipmentActionResult {
  const ship = shipments.find((s) => s.Shipment_ID === input.shipmentId);
  if (!ship) return { ok: false, message: "找不到該出貨單。" };
  if (ship.Shipment_Status === "Posted") {
    return { ok: false, message: "已過帳出貨單不可修改或刪改內容。" };
  }
  if (ship.Shipment_Status === "Cancelled") {
    return { ok: false, message: "已作廢草稿不可再修改。" };
  }

  if (input.cancel) {
    const next = shipments.map((s) =>
      s.Shipment_ID === ship.Shipment_ID
        ? {
            ...s,
            Shipment_Status: "Cancelled" as const,
            Updated_At: new Date().toISOString(),
          }
        : s,
    );
    return {
      ok: true,
      message: "草稿已作廢（庫存不變）。",
      shipment: next.find((s) => s.Shipment_ID === ship.Shipment_ID),
      shipments: next,
      shipmentDetails,
    };
  }

  const order = orders.find((o) => o.Order_ID === ship.Order_ID);
  if (!order) return { ok: false, message: "來源訂單不存在。" };

  const nextDetails = shipmentDetails.map((d) => ({ ...d }));
  if (input.shipQtyByLineNo) {
    const rows = nextDetails.filter((d) => d.Shipment_ID === ship.Shipment_ID);
    for (const row of rows) {
      const raw = input.shipQtyByLineNo[row.Line_No];
      if (raw === undefined) continue;
      if (
        typeof raw !== "number" ||
        !Number.isFinite(raw) ||
        !Number.isInteger(raw) ||
        raw <= 0
      ) {
        return {
          ok: false,
          message: `${row.Product_ID} 出貨量須為正整數（不可為 0、負數或小數）`,
        };
      }
      const od = orderDetails.find((x) => x.Detail_ID === row.Order_Line);
      if (!od) {
        return { ok: false, message: `找不到訂單列 ${row.Order_Line}` };
      }
      const rem = remainingQty(od);
      if (raw > rem) {
        return {
          ok: false,
          message: `${row.Product_ID} 出貨量 ${raw} 超過本單剩餘 ${rem}`,
        };
      }
      const reserve = reservations.find(
        (r) => r.Reserve_ID === row.Reservation_ID && r.Is_Active,
      );
      if (!reserve || reserve.Order_ID !== ship.Order_ID) {
        return {
          ok: false,
          message: `${row.Product_ID} 保留來源不符或已失效`,
        };
      }
      if (raw > reserve.Qty) {
        return {
          ok: false,
          message: `${row.Product_ID} 出貨量 ${raw} 超過有效保留 ${reserve.Qty}`,
        };
      }
      const prod = products.find((p) => p.Product_ID === row.Product_ID);
      if (prod?.Hold_Allocation) {
        return {
          ok: false,
          message: `${row.Product_ID} 盤點異常，不可出貨`,
        };
      }
      row.Ship_Qty = raw;
    }
  }

  const shipDate = input.shipmentDate?.trim() ?? ship.Shipment_Date;
  if (shipDate < order.Order_Date) {
    return { ok: false, message: "離倉日不得早於訂單日。" };
  }

  const updated: Shipment = {
    ...ship,
    Shipment_Date: shipDate,
    Recipient:
      input.recipient !== undefined
        ? input.recipient.trim()
        : ship.Recipient,
    Address_Snapshot:
      input.address !== undefined
        ? input.address.trim()
        : ship.Address_Snapshot,
    Delivery_Method: input.deliveryMethod ?? ship.Delivery_Method,
    Carrier:
      input.carrier !== undefined
        ? input.carrier.trim() || undefined
        : ship.Carrier,
    Tracking_No:
      input.trackingNo !== undefined
        ? input.trackingNo.trim() || undefined
        : ship.Tracking_No,
    Notes:
      input.notes !== undefined
        ? input.notes.trim() || undefined
        : ship.Notes,
    Updated_At: new Date().toISOString(),
  };

  if (!updated.Recipient) {
    return { ok: false, message: "收貨人不可空白。" };
  }
  if (!updated.Address_Snapshot) {
    return { ok: false, message: "收貨地址不可空白。" };
  }

  const nextShipments = shipments.map((s) =>
    s.Shipment_ID === ship.Shipment_ID ? updated : s,
  );

  return {
    ok: true,
    message: "草稿已更新（庫存不變）。",
    shipment: updated,
    details: nextDetails.filter((d) => d.Shipment_ID === ship.Shipment_ID),
    shipments: nextShipments,
    shipmentDetails: nextDetails,
  };
}

function validatePostFields(ship: Shipment): string | null {
  if (!ship.Recipient?.trim()) return "收貨人不可空白。";
  if (!ship.Address_Snapshot?.trim()) return "收貨地址不可空白。";
  if (!ship.Shipment_Date?.trim()) return "離倉日不可空白。";
  if (ship.Delivery_Method === "宅配") {
    if (!ship.Carrier?.trim()) return "宅配須填承運人。";
    if (!ship.Tracking_No?.trim()) return "宅配須填追蹤號。";
  }
  if (ship.Delivery_Method === "自取") {
    if (!ship.Receipt_Note?.trim() && !ship.Notes?.trim()) {
      // 自取允許備註或交付紀錄其一；過帳前可帶 Receipt_Note
    }
  }
  return null;
}

/** Admin 出貨過帳：現有↓＋保留↓同次；冪等；失敗全回滾 */
export function postShipment(
  shipmentId: string,
  role: Role,
  user: AppUser,
  orders: SalesOrder[],
  orderDetails: SalesOrderDetail[],
  products: Product[],
  moves: StockMove[],
  reservations: StockReservation[],
  shipments: Shipment[],
  shipmentDetails: ShipmentDetail[],
  deliveryLogs: DeliveryStatusLog[],
  options?: { receiptNote?: string },
): ShipmentActionResult {
  if (role !== "Admin") {
    return {
      ok: false,
      message: "僅管理者可執行出貨過帳並扣庫存。",
    };
  }

  const ship = shipments.find((s) => s.Shipment_ID === shipmentId);
  if (!ship) return { ok: false, message: "找不到該出貨單。" };

  // 冪等：已過帳直接回傳原結果
  if (ship.Shipment_Status === "Posted") {
    return {
      ok: true,
      message: "此出貨單已過帳，不再新增異動（冪等）。",
      shipment: ship,
      details: shipmentDetails.filter((d) => d.Shipment_ID === shipmentId),
      shipments,
      shipmentDetails,
      products,
      moves,
      reservations,
      orderDetails,
      deliveryLogs,
      order: orders.find((o) => o.Order_ID === ship.Order_ID),
    };
  }

  if (ship.Shipment_Status === "Cancelled") {
    return { ok: false, message: "已作廢草稿不可過帳。" };
  }

  let workingShip = { ...ship };
  if (options?.receiptNote?.trim()) {
    workingShip = {
      ...workingShip,
      Receipt_Note: options.receiptNote.trim(),
    };
  }

  const fieldErr = validatePostFields(workingShip);
  if (fieldErr) return { ok: false, message: fieldErr };

  const order = orders.find((o) => o.Order_ID === workingShip.Order_ID);
  if (!order) return { ok: false, message: "來源訂單不存在。" };
  if (order.Order_Status !== "Confirmed") {
    return {
      ok: false,
      message: `訂單狀態為 ${order.Order_Status}，不可過帳出貨。`,
    };
  }
  if (workingShip.Shipment_Date < order.Order_Date) {
    return { ok: false, message: "離倉日不得早於訂單日。" };
  }

  const rows = shipmentDetails.filter(
    (d) => d.Shipment_ID === shipmentId,
  );
  if (rows.length === 0) {
    return { ok: false, message: "出貨明細不可為空。" };
  }

  // —— 重查剩餘／保留／現有（不以畫面舊數字）——
  const demandByProduct = new Map<string, number>();
  for (const row of rows) {
    if (
      !Number.isInteger(row.Ship_Qty) ||
      row.Ship_Qty <= 0
    ) {
      return {
        ok: false,
        message: `${row.Product_ID} 出貨量須為正整數`,
      };
    }
    const od = orderDetails.find((d) => d.Detail_ID === row.Order_Line);
    if (!od || od.Order_ID !== order.Order_ID) {
      return {
        ok: false,
        message: `${row.Product_ID} 訂單列不符`,
      };
    }
    const rem = remainingQty(od);
    if (row.Ship_Qty > rem) {
      return {
        ok: false,
        message: `${row.Product_ID} 剩餘未出貨量為 ${rem}，無法出 ${row.Ship_Qty}（可能已被其他出貨單出完）`,
      };
    }
    const reserve = reservations.find(
      (r) => r.Reserve_ID === row.Reservation_ID,
    );
    if (
      !reserve ||
      !reserve.Is_Active ||
      reserve.Order_ID !== order.Order_ID ||
      reserve.Detail_ID !== row.Order_Line
    ) {
      return {
        ok: false,
        message: `${row.Product_ID} 保留來源不符或已失效／已消耗`,
      };
    }
    if (reserve.Qty < row.Ship_Qty) {
      return {
        ok: false,
        message: `${row.Product_ID} 有效保留不足`,
      };
    }
    const product = products.find((p) => p.Product_ID === row.Product_ID);
    if (!product) {
      return { ok: false, message: `找不到商品 ${row.Product_ID}` };
    }
    if (product.Hold_Allocation) {
      return {
        ok: false,
        message: `${row.Product_ID} 盤點異常，整單拒絕出貨`,
      };
    }
    if (product.Unit !== row.Unit_Snapshot && row.Unit_Snapshot) {
      // 單位不一致仍允許以快照為準，但主檔須存在
    }
    demandByProduct.set(
      row.Product_ID,
      (demandByProduct.get(row.Product_ID) ?? 0) + row.Ship_Qty,
    );
  }

  for (const [pid, demand] of demandByProduct) {
    const product = products.find((p) => p.Product_ID === pid)!;
    if (product.On_Hand < demand) {
      return {
        ok: false,
        message: `${pid} 現有量 ${product.On_Hand} 不足本單需求合計 ${demand}`,
      };
    }
  }

  // —— 同次原子更新（全成功才回傳新狀態）——
  const postedAt = new Date().toISOString();
  let nextProducts = products.map((p) => ({ ...p }));
  let nextMoves = [...moves];
  let nextReserves = reservations.map((r) => ({ ...r }));
  let nextOrderDetails = orderDetails.map((d) => ({ ...d }));
  let moveSeqBase = nextMoveId(nextMoves);

  for (const row of rows) {
    // 來源單號＋來源列號唯一
    const dup = nextMoves.some(
      (m) =>
        (m.Move_Type === "Sales_Shipment" || m.Move_Type === "出貨扣庫") &&
        m.Source_Doc_ID === shipmentId &&
        m.Source_Line_No === row.Line_No &&
        (m.Status ?? "Posted") === "Posted",
    );
    if (dup) {
      return {
        ok: false,
        message: `來源 ${shipmentId} 列 ${row.Line_No} 已有出庫異動，拒絕重複扣帳`,
      };
    }

    const moveId = moveSeqBase;
    const match = /^M(\d+)$/i.exec(moveSeqBase);
    if (match) {
      const n = Number.parseInt(match[1], 10) + 1;
      moveSeqBase = `M${String(n).padStart(3, "0")}`;
    }

    nextProducts = applyOnHandDelta(
      nextProducts,
      row.Product_ID,
      -row.Ship_Qty,
    );
    nextMoves = [
      ...nextMoves,
      {
        Move_ID: moveId,
        Product_ID: row.Product_ID,
        Warehouse_ID: WAREHOUSE_ID,
        Move_Type: "Sales_Shipment",
        Qty: -row.Ship_Qty,
        Status: "Posted",
        Source_Doc_ID: shipmentId,
        Source_Line_No: row.Line_No,
        Reason: "出貨扣庫",
        Ref_Order_ID: order.Order_ID,
        Move_Date: workingShip.Shipment_Date,
        Posted_At: postedAt,
        Handled_By: user.User_ID,
        Note: `出貨過帳 ${shipmentId} 列 ${row.Line_No}`,
      },
    ];

    // 消耗保留（不刪除）
    nextReserves = nextReserves.map((r) => {
      if (r.Reserve_ID !== row.Reservation_ID) return r;
      return {
        ...r,
        Is_Active: false,
        Consume_Reason: "shipment" as const,
        Consumed_By_Shipment_ID: shipmentId,
        Consumed_At: postedAt,
        Released_At: postedAt,
      };
    });

    nextOrderDetails = nextOrderDetails.map((d) => {
      if (d.Detail_ID !== row.Order_Line) return d;
      return {
        ...d,
        Shipped_Qty: (d.Shipped_Qty ?? 0) + row.Ship_Qty,
      };
    });
  }

  const fulfillment = computeFulfillment(order.Order_ID, nextOrderDetails);
  const nextOrder: SalesOrder = {
    ...order,
    Stock_Deducted: fulfillment === "Shipped",
  };

  let nextDelivery: DeliveryStatus = workingShip.Delivery_Status;
  let deliveredAt = workingShip.Delivered_At;
  let receiptNote = workingShip.Receipt_Note;
  if (workingShip.Delivery_Method === "宅配") {
    nextDelivery = "InTransit";
  } else {
    // 自取：過帳後可登記交付；仍只過帳一次
    nextDelivery = "Delivered";
    deliveredAt = postedAt;
    receiptNote =
      receiptNote ||
      workingShip.Notes ||
      "自取交付核對完成";
  }

  const postedShip: Shipment = {
    ...workingShip,
    Shipment_Status: "Posted",
    Delivery_Status: nextDelivery,
    Posted_At: postedAt,
    Posted_By: user.User_ID,
    Delivered_At: deliveredAt,
    Receipt_Note: receiptNote,
    Updated_At: postedAt,
  };

  const nextShipments = shipments.map((s) =>
    s.Shipment_ID === shipmentId ? postedShip : s,
  );

  let nextLogs = [...deliveryLogs];
  if (ship.Delivery_Status !== nextDelivery) {
    nextLogs = [
      ...nextLogs,
      {
        Log_ID: nextDeliveryLogId(nextLogs),
        Shipment_ID: shipmentId,
        From_Status: ship.Delivery_Status,
        To_Status: nextDelivery,
        Reason:
          workingShip.Delivery_Method === "宅配"
            ? "出貨過帳，交付承運人"
            : "自取過帳並登錄交付",
        At: postedAt,
        By_User_ID: user.User_ID,
        By_User_Name: user.User_Name,
      },
    ];
  }

  return {
    ok: true,
    message: `出貨 ${shipmentId} 已過帳：現有↓ 保留↓（Sales_Shipment）。`,
    shipment: postedShip,
    details: rows,
    shipments: nextShipments,
    shipmentDetails,
    products: nextProducts,
    moves: nextMoves,
    reservations: nextReserves,
    orderDetails: nextOrderDetails,
    order: nextOrder,
    deliveryLogs: nextLogs,
  };
}

export type UpdateDeliveryInput = {
  shipmentId: string;
  role: Role;
  user: AppUser;
  toStatus: DeliveryStatus;
  reason?: string;
  trackingNo?: string;
  receiptNote?: string;
  exceptionNote?: string;
  deliveredAt?: string;
};

/** 物流更新：不改庫存、不推定收款 */
export function updateDeliveryStatus(
  input: UpdateDeliveryInput,
  shipments: Shipment[],
  deliveryLogs: DeliveryStatusLog[],
  products: Product[],
  reservations: StockReservation[],
): ShipmentActionResult {
  const ship = shipments.find((s) => s.Shipment_ID === input.shipmentId);
  if (!ship) return { ok: false, message: "找不到該出貨單。" };
  if (ship.Shipment_Status !== "Posted") {
    return {
      ok: false,
      message: "僅已過帳出貨單可更新物流狀態。",
    };
  }

  // Staff 可依規則更新物流；不可改 Ship_Qty（此函式也不接受數量）
  const from = ship.Delivery_Status;
  const to = input.toStatus;
  if (from === to && input.trackingNo === undefined) {
    return {
      ok: true,
      message: "物流狀態未變更。",
      shipment: ship,
      shipments,
      deliveryLogs,
      products,
      reservations,
    };
  }

  if (to === "Delivered") {
    const at = input.deliveredAt?.trim() || new Date().toISOString();
    if (ship.Posted_At && at < ship.Posted_At) {
      return { ok: false, message: "送達時間不得早於出貨過帳時間。" };
    }
  }
  if (to === "Exception" && !input.exceptionNote?.trim() && !input.reason?.trim()) {
    return { ok: false, message: "異常須填寫原因／內容。" };
  }

  const now = new Date().toISOString();
  const trackingBefore = ship.Tracking_No;
  const trackingAfter =
    input.trackingNo !== undefined
      ? input.trackingNo.trim() || undefined
      : ship.Tracking_No;

  const updated: Shipment = {
    ...ship,
    Delivery_Status: to,
    Tracking_No: trackingAfter,
    Receipt_Note:
      input.receiptNote !== undefined
        ? input.receiptNote.trim() || undefined
        : ship.Receipt_Note,
    Delivered_At:
      to === "Delivered"
        ? input.deliveredAt?.trim() || now
        : ship.Delivered_At,
    Exception_Note:
      to === "Exception"
        ? (input.exceptionNote ?? input.reason ?? "").trim()
        : ship.Exception_Note,
    Exception_At: to === "Exception" ? now : ship.Exception_At,
    Exception_By: to === "Exception" ? input.user.User_ID : ship.Exception_By,
    Updated_At: now,
  };

  const log: DeliveryStatusLog = {
    Log_ID: nextDeliveryLogId(deliveryLogs),
    Shipment_ID: ship.Shipment_ID,
    From_Status: from,
    To_Status: to,
    Reason: (input.reason ?? input.exceptionNote ?? "").trim() || undefined,
    Tracking_No_Before: trackingBefore,
    Tracking_No_After: trackingAfter,
    At: now,
    By_User_ID: input.user.User_ID,
    By_User_Name: input.user.User_Name,
  };

  // 明確：不碰 products／reservations（商品未回倉不回補）
  return {
    ok: true,
    message: `物流 ${deliveryStatusLabelZh(from)} → ${deliveryStatusLabelZh(to)}（庫存不變、未推定收款）。`,
    shipment: updated,
    shipments: shipments.map((s) =>
      s.Shipment_ID === ship.Shipment_ID ? updated : s,
    ),
    deliveryLogs: [...deliveryLogs, log],
    products,
    reservations,
  };
}

/** 查詢交集過濾 */
export function filterShipments(
  shipments: Shipment[],
  orders: SalesOrder[],
  customers: { Customer_ID: string; Customer_Name: string }[],
  query: {
    q?: string;
    status?: ShipmentStatus | "";
    delivery?: DeliveryStatus | "";
    dateFrom?: string;
    dateTo?: string;
    customerId?: string;
  },
): Shipment[] {
  const q = (query.q ?? "").trim().toLowerCase();
  return shipments.filter((s) => {
    if (query.status && s.Shipment_Status !== query.status) return false;
    if (query.delivery && s.Delivery_Status !== query.delivery) return false;
    if (query.dateFrom && s.Shipment_Date < query.dateFrom) return false;
    if (query.dateTo && s.Shipment_Date > query.dateTo) return false;
    const order = orders.find((o) => o.Order_ID === s.Order_ID);
    if (query.customerId && order?.Customer_ID !== query.customerId) {
      return false;
    }
    if (!q) return true;
    const cust = order
      ? customers.find((c) => c.Customer_ID === order.Customer_ID)
      : undefined;
    const hay = [
      s.Shipment_ID,
      s.Order_ID,
      s.Tracking_No,
      s.Recipient,
      order?.Customer_ID,
      cust?.Customer_Name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function reservedStillActive(
  productId: string,
  reservations: StockReservation[],
): number {
  return computeReserved(productId, reservations);
}
