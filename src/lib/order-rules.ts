import { todayLocalDate } from "./quotation-rules";
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

/**
 * Accepted 報價 → Sales_Order＋明細。
 * 複製客戶／商品／Qty／Unit_Price 快照；停用客戶或明細商品不可轉。
 */
export function convertQuoteToOrder(
  quote: Quotation,
  quoteDetails: QuotationDetail[],
  customers: Customer[],
  products: Product[],
  orders: SalesOrder[],
  orderDetails: SalesOrderDetail[],
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
    return {
      Detail_ID: detailId,
      Order_ID: orderId,
      Product_ID: line.Product_ID,
      Qty: line.Qty,
      Unit_Price: line.Unit_Price,
      Discount: 1,
      Subtotal: subtotal,
    };
  });

  const order: SalesOrder = {
    Order_ID: orderId,
    Order_Date: todayLocalDate(),
    Customer_ID: quote.Customer_ID,
    Order_Status: "待確認",
    Total_Amount: quote.Total,
    Quote_ID: quote.Quote_ID,
    Stock_Deducted: false,
  };

  return {
    ok: true,
    message: `已由 ${quote.Quote_ID} 建立訂單 ${orderId}（待確認）。`,
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
