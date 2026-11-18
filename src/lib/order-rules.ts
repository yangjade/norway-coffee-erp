import { addDays, todayLocalDate } from "./quotation-rules";
import type {
  Customer,
  Product,
  Quotation,
  QuotationDetail,
  SalesOrder,
  SalesOrderDetail,
} from "./types";

export type OrderActionResult = {
  ok: boolean;
  message?: string;
  order?: SalesOrder;
  details?: SalesOrderDetail[];
};

/** 預設交期＝訂單日 + 7 天（教學慣例） */
export const DEFAULT_DELIVERY_LEAD_DAYS = 7;

export function nextOrderId(orders: SalesOrder[]): string {
  let max = 0;
  for (const o of orders) {
    const m = /^SO(\d+)$/i.exec(o.Order_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `SO${String(max + 1).padStart(3, "0")}`;
}

export function nextDetailId(details: SalesOrderDetail[]): string {
  let max = 0;
  for (const d of details) {
    const m = /^D(\d+)$/i.exec(d.Detail_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `D${String(max + 1).padStart(3, "0")}`;
}

export function orderAlreadyFromQuote(
  orders: SalesOrder[],
  quoteId: string,
): SalesOrder | undefined {
  return orders.find((o) => o.Quote_ID === quoteId);
}

export function defaultDeliveryDate(
  orderDate: string = todayLocalDate(),
  leadDays: number = DEFAULT_DELIVERY_LEAD_DAYS,
): string {
  return addDays(orderDate, leadDays);
}

/** 補齊舊資料缺交期；不覆寫既有 Delivery_Date */
export function ensureOrderDeliveryDate(order: SalesOrder): SalesOrder {
  if (order.Delivery_Date && /^\d{4}-\d{2}-\d{2}$/.test(order.Delivery_Date)) {
    return order;
  }
  return {
    ...order,
    Delivery_Date: defaultDeliveryDate(order.Order_Date || todayLocalDate()),
  };
}

export function validateDeliveryDate(
  deliveryDate: string,
  orderDate: string,
): { ok: boolean; message?: string } {
  const trimmed = deliveryDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, message: "交期格式須為 YYYY-MM-DD。" };
  }
  if (trimmed < orderDate) {
    return { ok: false, message: "交期不可早於訂單日期。" };
  }
  return { ok: true };
}

/**
 * Accepted 報價 → Sales_Order＋明細。
 * 複製客戶／商品名／Qty／Unit_Price／總額快照；寫入交期；
 * 停用客戶或明細商品不可轉；同一報價不可重複轉。
 */
export function convertQuoteToOrder(
  quote: Quotation,
  quoteDetails: QuotationDetail[],
  customers: Customer[],
  products: Product[],
  orders: SalesOrder[],
  orderDetails: SalesOrderDetail[],
  options?: { deliveryDate?: string },
): OrderActionResult {
  if (quote.Status !== "Accepted") {
    return {
      ok: false,
      message: `僅 Accepted 報價可轉訂單（目前 ${quote.Status}）。`,
    };
  }

  const existing = orderAlreadyFromQuote(orders, quote.Quote_ID);
  if (existing) {
    return {
      ok: false,
      message: `此報價已轉為 ${existing.Order_ID}，不可重複轉換。`,
      order: existing,
    };
  }

  const customer = customers.find((c) => c.Customer_ID === quote.Customer_ID);
  if (!customer) {
    return { ok: false, message: `找不到客戶 ${quote.Customer_ID}。` };
  }
  if (!customer.Is_Active) {
    return {
      ok: false,
      message: `客戶 ${customer.Customer_ID} 已停用，無法轉訂單。請先啟用客戶。`,
    };
  }

  const lines = quoteDetails
    .filter((d) => d.Quote_ID === quote.Quote_ID)
    .sort((a, b) => a.Line_No - b.Line_No);

  if (lines.length === 0) {
    return { ok: false, message: "報價無明細，無法轉訂單。" };
  }

  const inactiveProducts: string[] = [];
  for (const line of lines) {
    const p = products.find((x) => x.Product_ID === line.Product_ID);
    if (!p) {
      return {
        ok: false,
        message: `明細商品 ${line.Product_ID} 不存在於主檔。`,
      };
    }
    if (!p.Is_Active) inactiveProducts.push(p.Product_ID);
  }
  if (inactiveProducts.length > 0) {
    return {
      ok: false,
      message: `明細含停用商品（${inactiveProducts.join("、")}），無法轉訂單。請先啟用或改報價。`,
    };
  }

  const orderDate = todayLocalDate();
  const deliveryDate =
    options?.deliveryDate?.trim() || defaultDeliveryDate(orderDate);
  const deliveryCheck = validateDeliveryDate(deliveryDate, orderDate);
  if (!deliveryCheck.ok) {
    return { ok: false, message: deliveryCheck.message };
  }

  const orderId = nextOrderId(orders);
  let detailSeq = 0;
  const maxExisting = orderDetails.reduce((m, d) => {
    const match = /^D(\d+)$/i.exec(d.Detail_ID.trim());
    if (!match) return m;
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);

  const details: SalesOrderDetail[] = lines.map((line) => {
    detailSeq += 1;
    const detailId = `D${String(maxExisting + detailSeq).padStart(3, "0")}`;
    const subtotal = line.Qty * line.Unit_Price;
    const product = products.find((x) => x.Product_ID === line.Product_ID);
    return {
      Detail_ID: detailId,
      Order_ID: orderId,
      Product_ID: line.Product_ID,
      Product_Name_Snapshot:
        line.Product_Name_Snapshot || product?.Product_Name || line.Product_ID,
      Qty: line.Qty,
      Unit_Price: line.Unit_Price,
      Discount: 1,
      Subtotal: subtotal,
    };
  });

  const order: SalesOrder = {
    Order_ID: orderId,
    Order_Date: orderDate,
    Customer_ID: quote.Customer_ID,
    Order_Status: "待確認",
    Total_Amount: quote.Total,
    Delivery_Date: deliveryDate,
    Quote_ID: quote.Quote_ID,
    Stock_Deducted: false,
  };

  return {
    ok: true,
    message: `已由 ${quote.Quote_ID} 建立訂單 ${orderId}（待確認；交期 ${deliveryDate}）。`,
    order,
    details,
  };
}

export const ORDER_STATUSES = [
  "待確認",
  "處理中",
  "已出貨",
  "已取消",
] as const;

/** 第 8 週狀態機說明（UI／驗收用） */
export const ORDER_STATUS_RULES_ZH = [
  "待確認：轉單預設；可改為處理中、已出貨或已取消",
  "處理中：備貨中；可出貨或取消",
  "已出貨：履約完成（會觸發第 10／12 週扣庫與應收）；可改回其他狀態並還原",
  "已取消：終止履約；不可直接標已出貨（須先改回待確認／處理中）",
] as const;
