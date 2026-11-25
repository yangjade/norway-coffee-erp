import { addDays, todayLocalDate } from "./quotation-rules";
import type {
  AppUser,
  Customer,
  OrderAuditEntry,
  OrderStatus,
  Product,
  Quotation,
  QuotationDetail,
  Role,
  SalesOrder,
  SalesOrderDetail,
} from "./types";

export type OrderActionResult = {
  ok: boolean;
  message?: string;
  order?: SalesOrder;
  details?: SalesOrderDetail[];
  audit?: OrderAuditEntry;
};

/** 第 8 週講義固定業務日（驗收案例） */
export const WEEK8_BUSINESS_DATE = "2026-11-18";

export const ORDER_STATUSES: OrderStatus[] = [
  "Draft",
  "Confirmed",
  "Cancelled",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  Draft: "草稿",
  Confirmed: "已確認",
  Cancelled: "已取消",
};

export function statusLabelZh(status: OrderStatus): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

export function nextOrderId(orders: SalesOrder[], asOf = WEEK8_BUSINESS_DATE): string {
  const prefix = `SO-${asOf.replace(/-/g, "")}-`;
  let max = 0;
  for (const o of orders) {
    if (o.Order_ID.startsWith(prefix)) {
      const n = Number.parseInt(o.Order_ID.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
    const m = /^SO(\d+)$/i.exec(o.Order_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
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

export function nextAuditId(audits: OrderAuditEntry[]): string {
  let max = 0;
  for (const a of audits) {
    const m = /^A(\d+)$/i.exec(a.Audit_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `A${String(max + 1).padStart(3, "0")}`;
}

export function orderAlreadyFromQuote(
  orders: SalesOrder[],
  quoteId: string,
): SalesOrder | undefined {
  return orders.find((o) => o.Quote_ID === quoteId);
}

/** 折後未稅額：數量 × 單價 × (1 − 折扣率/100)，四捨五入整數 */
export function computeLineAmount(
  qty: number,
  unitPrice: number,
  discountRate: number,
): number {
  return Math.round(qty * unitPrice * (1 - discountRate / 100));
}

export function computeOrderMoney(details: SalesOrderDetail[], taxRate = 0.05) {
  const subtotal = details.reduce((s, d) => s + d.Line_Amount, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  return {
    Subtotal: subtotal,
    Tax_Rate: taxRate,
    Tax_Amount: taxAmount,
    Total_Amount: subtotal + taxAmount,
  };
}

export function isLateDelivery(order: SalesOrder): boolean {
  return Boolean(
    order.Promised_Date &&
      order.Requested_Date &&
      order.Promised_Date > order.Requested_Date,
  );
}

export function ensureOrderShape(raw: SalesOrder): SalesOrder {
  const promised =
    raw.Promised_Date ||
    raw.Delivery_Date ||
    addDays(raw.Order_Date || WEEK8_BUSINESS_DATE, 5);
  const requested = raw.Requested_Date || promised;
  const money =
    raw.Subtotal != null && raw.Tax_Amount != null
      ? {
          Subtotal: raw.Subtotal,
          Tax_Rate: raw.Tax_Rate ?? 0.05,
          Tax_Amount: raw.Tax_Amount,
          Total_Amount: raw.Total_Amount,
        }
      : {
          Subtotal: raw.Total_Amount,
          Tax_Rate: 0.05,
          Tax_Amount: 0,
          Total_Amount: raw.Total_Amount,
        };

  let status: OrderStatus = "Draft";
  const s = String(raw.Order_Status);
  if (s === "Draft" || s === "Confirmed" || s === "Cancelled") {
    status = s;
  } else if (s === "已取消" || s === "Cancelled") {
    status = "Cancelled";
  } else if (s === "已出貨") {
    status = "Confirmed";
  } else if (s === "處理中" || s === "待確認") {
    status = s === "待確認" ? "Draft" : "Confirmed";
  }

  return {
    ...raw,
    Order_Status: status,
    Requested_Date: requested,
    Promised_Date: promised,
    Delivery_Agreed: Boolean(raw.Delivery_Agreed),
    Delivery_Date: promised,
    Subtotal: money.Subtotal,
    Tax_Rate: money.Tax_Rate,
    Tax_Amount: money.Tax_Amount,
    Total_Amount: money.Total_Amount,
    Stock_Deducted:
      raw.Stock_Deducted ??
      (String(raw.Order_Status) === "已出貨" ? true : false),
  };
}

export function ensureDetailShape(raw: SalesOrderDetail): SalesOrderDetail {
  const rate =
    raw.Discount_Rate != null
      ? raw.Discount_Rate
      : raw.Discount != null && raw.Discount < 1
        ? Math.round((1 - raw.Discount) * 100)
        : 0;
  const line =
    raw.Line_Amount != null
      ? raw.Line_Amount
      : raw.Subtotal != null
        ? Math.round(raw.Subtotal)
        : computeLineAmount(raw.Qty, raw.Unit_Price, rate);
  const shipped =
    typeof raw.Shipped_Qty === "number" && Number.isFinite(raw.Shipped_Qty)
      ? Math.max(0, Math.floor(raw.Shipped_Qty))
      : 0;
  return {
    ...raw,
    Product_Name_Snapshot: raw.Product_Name_Snapshot || raw.Product_ID,
    Unit_Snapshot: raw.Unit_Snapshot || "件",
    Discount_Rate: rate,
    Line_Amount: line,
    Shipped_Qty: shipped,
  };
}

function quoteNotExpired(quote: Quotation, asOf: string): boolean {
  return quote.Valid_Until >= asOf;
}

/**
 * Accepted 且未逾期報價 → Draft 銷售訂單＋明細快照。
 * 已轉過則回傳既有訂單（不重複建）。
 */
export function convertQuoteToOrder(
  quote: Quotation,
  quoteDetails: QuotationDetail[],
  customers: Customer[],
  products: Product[],
  orders: SalesOrder[],
  orderDetails: SalesOrderDetail[],
  options?: {
    asOfDate?: string;
    requestedDate?: string;
    promisedDate?: string;
  },
): OrderActionResult {
  const asOf = options?.asOfDate ?? WEEK8_BUSINESS_DATE;

  const existing = orderAlreadyFromQuote(orders, quote.Quote_ID);
  if (existing) {
    return {
      ok: true,
      message: `此報價已轉為 ${existing.Order_ID}，開啟原訂單。`,
      order: existing,
      details: orderDetails.filter((d) => d.Order_ID === existing.Order_ID),
    };
  }

  if (quote.Status !== "Accepted") {
    return {
      ok: false,
      message: `僅「已接受」報價可轉訂單（目前 ${quote.Status}）。`,
    };
  }
  if (!quoteNotExpired(quote, asOf)) {
    return {
      ok: false,
      message: `報價 ${quote.Quote_ID} 已逾期（有效至 ${quote.Valid_Until}），不可轉單。`,
    };
  }

  const customer = customers.find((c) => c.Customer_ID === quote.Customer_ID);
  if (!customer) {
    return { ok: false, message: `找不到客戶 ${quote.Customer_ID}。` };
  }
  if (!customer.Is_Active) {
    return {
      ok: false,
      message: `客戶 ${customer.Customer_ID} 已停用，無法轉訂單。`,
    };
  }

  const lines = quoteDetails
    .filter((d) => d.Quote_ID === quote.Quote_ID)
    .sort((a, b) => a.Line_No - b.Line_No);
  if (lines.length === 0) {
    return { ok: false, message: "報價無明細，無法轉訂單。" };
  }

  for (const line of lines) {
    const p = products.find((x) => x.Product_ID === line.Product_ID);
    if (!p) {
      return { ok: false, message: `明細商品 ${line.Product_ID} 不存在。` };
    }
    if (!p.Is_Active) {
      return {
        ok: false,
        message: `明細含停用商品（${p.Product_ID}），無法轉訂單。`,
      };
    }
  }

  const requested = options?.requestedDate ?? addDays(asOf, 5);
  const promised = options?.promisedDate ?? requested;
  const orderId = nextOrderId(orders, asOf);

  let detailSeq = 0;
  const maxExisting = orderDetails.reduce((m, d) => {
    const match = /^D(\d+)$/i.exec(d.Detail_ID.trim());
    if (!match) return m;
    const n = Number.parseInt(match[1], 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);

  const details: SalesOrderDetail[] = lines.map((line) => {
    detailSeq += 1;
    const product = products.find((x) => x.Product_ID === line.Product_ID)!;
    const rate = line.Discount_Rate ?? 0;
    const lineAmount = computeLineAmount(line.Qty, line.Unit_Price, rate);
    return {
      Detail_ID: `D${String(maxExisting + detailSeq).padStart(3, "0")}`,
      Order_ID: orderId,
      Product_ID: line.Product_ID,
      Product_Name_Snapshot:
        line.Product_Name_Snapshot || product.Product_Name,
      Unit_Snapshot: line.Unit_Snapshot || product.Unit,
      Qty: line.Qty,
      Unit_Price: line.Unit_Price,
      Discount_Rate: rate,
      Line_Amount: lineAmount,
    };
  });

  const money = computeOrderMoney(details, quote.Tax_Rate || 0.05);
  const order: SalesOrder = {
    Order_ID: orderId,
    Order_Date: asOf,
    Customer_ID: quote.Customer_ID,
    Order_Status: "Draft",
    Quote_ID: quote.Quote_ID,
    Requested_Date: requested,
    Promised_Date: promised,
    Delivery_Agreed: false,
    Delivery_Date: promised,
    Ship_To_Name: customer.Customer_Name,
    Ship_To_Address: customer.Notes?.includes("地址")
      ? customer.Notes
      : "台北市教學路 100 號（挪威的咖啡示範）",
    Payment_Terms_Snapshot:
      customer.Payment_Terms === "現結" ? "匯款後出貨" : customer.Payment_Terms,
    Notes: "",
    ...money,
    Stock_Deducted: false,
  };

  return {
    ok: true,
    message: `已由 ${quote.Quote_ID} 建立草稿訂單 ${orderId}（總額 ${money.Total_Amount}）。`,
    order,
    details,
  };
}

export type DraftPatch = {
  requestedDate?: string;
  promisedDate?: string;
  deliveryAgreed?: boolean;
  deliveryAgreeNote?: string;
  shipToName?: string;
  shipToAddress?: string;
  paymentTerms?: string;
  notes?: string;
  /** Detail_ID → Qty */
  qtyByDetailId?: Record<string, number>;
};

export function updateDraftOrder(
  order: SalesOrder,
  details: SalesOrderDetail[],
  patch: DraftPatch,
  role: Role,
): OrderActionResult {
  if (order.Order_Status !== "Draft") {
    return {
      ok: false,
      message: `僅草稿可修改（目前 ${statusLabelZh(order.Order_Status)}）。`,
    };
  }
  void role;

  const nextDetails = details.map((d) => {
    if (!patch.qtyByDetailId || !(d.Detail_ID in patch.qtyByDetailId)) {
      return { ...d };
    }
    const qty = patch.qtyByDetailId[d.Detail_ID];
    if (!Number.isInteger(qty) || qty <= 0) {
      return { ...d, Qty: qty };
    }
    return {
      ...d,
      Qty: qty,
      Line_Amount: computeLineAmount(qty, d.Unit_Price, d.Discount_Rate),
    };
  });

  for (const d of nextDetails) {
    if (!Number.isInteger(d.Qty) || d.Qty <= 0) {
      return {
        ok: false,
        message: `數量必須為大於 0 的整數（${d.Product_ID} 目前 ${d.Qty}）。`,
      };
    }
  }

  const requested = patch.requestedDate ?? order.Requested_Date;
  const promised = patch.promisedDate ?? order.Promised_Date;
  if (requested < order.Order_Date) {
    return { ok: false, message: "期望交貨日不可早於訂單日。" };
  }
  if (promised < order.Order_Date) {
    return { ok: false, message: "承諾交貨日不可早於訂單日。" };
  }

  const money = computeOrderMoney(nextDetails, order.Tax_Rate || 0.05);
  const next: SalesOrder = {
    ...order,
    Requested_Date: requested,
    Promised_Date: promised,
    Delivery_Date: promised,
    Delivery_Agreed:
      patch.deliveryAgreed != null
        ? patch.deliveryAgreed
        : order.Delivery_Agreed,
    Delivery_Agree_Note:
      patch.deliveryAgreeNote ?? order.Delivery_Agree_Note,
    Ship_To_Name: patch.shipToName ?? order.Ship_To_Name,
    Ship_To_Address: patch.shipToAddress ?? order.Ship_To_Address,
    Payment_Terms_Snapshot:
      patch.paymentTerms ?? order.Payment_Terms_Snapshot,
    Notes: patch.notes ?? order.Notes,
    ...money,
  };

  return {
    ok: true,
    message: "草稿已儲存。",
    order: next,
    details: nextDetails,
  };
}

export function validateConfirm(order: SalesOrder, details: SalesOrderDetail[]) {
  const errors: string[] = [];
  if (!order.Customer_ID) errors.push("缺少客戶");
  if (details.length === 0) errors.push("缺少商品明細");
  for (const d of details) {
    if (!Number.isInteger(d.Qty) || d.Qty <= 0) {
      errors.push(`數量錯誤（${d.Product_ID}）`);
    }
  }
  if (!order.Promised_Date) errors.push("缺少承諾交貨日");
  if (order.Promised_Date < order.Order_Date) {
    errors.push("承諾交貨日不可早於訂單日");
  }
  if (order.Requested_Date && order.Requested_Date < order.Order_Date) {
    errors.push("期望交貨日不可早於訂單日");
  }
  if (!order.Ship_To_Address?.trim()) errors.push("缺少收貨地址");
  if (!order.Payment_Terms_Snapshot?.trim()) errors.push("缺少付款條件");
  if (isLateDelivery(order) && !order.Delivery_Agreed) {
    errors.push("承諾晚於期望：須取得改期同意後才可確認");
  }
  return errors;
}

export function confirmOrder(
  order: SalesOrder,
  details: SalesOrderDetail[],
): OrderActionResult {
  if (order.Order_Status !== "Draft") {
    return {
      ok: false,
      message: `僅草稿可確認（目前 ${statusLabelZh(order.Order_Status)}）。`,
    };
  }
  const errors = validateConfirm(order, details);
  if (errors.length) {
    return { ok: false, message: `無法確認：${errors.join("；")}` };
  }
  return {
    ok: true,
    message: "訂單已確認（不扣庫存、不建應收）。",
    order: { ...order, Order_Status: "Confirmed" },
    details,
  };
}

export function cancelOrder(
  order: SalesOrder,
  role: Role,
  reason: string,
  user: AppUser,
  audits: OrderAuditEntry[],
): OrderActionResult {
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, message: "取消須填寫原因。" };
  }
  if (order.Order_Status === "Cancelled") {
    return { ok: false, message: "訂單已是取消狀態。" };
  }
  if (order.Order_Status === "Confirmed" && role !== "Admin") {
    return {
      ok: false,
      message: "Staff 不可取消已確認訂單（僅管理者可填原因取消）。",
    };
  }
  if (order.Stock_Deducted) {
    return {
      ok: false,
      message: "已出貨扣庫之訂單請先於出貨模組取消出貨，再取消訂單。",
    };
  }
  const audit: OrderAuditEntry = {
    Audit_ID: nextAuditId(audits),
    Order_ID: order.Order_ID,
    At: new Date().toISOString(),
    User_ID: user.User_ID,
    User_Name: user.User_Name,
    Action: "取消",
    Reason: trimmed,
    Before: order.Order_Status,
    After: "Cancelled",
  };
  return {
    ok: true,
    message: "訂單已取消。",
    order: {
      ...order,
      Order_Status: "Cancelled",
      Cancel_Reason: trimmed,
    },
    audit,
  };
}

export function reopenOrder(
  order: SalesOrder,
  role: Role,
  reason: string,
  user: AppUser,
  audits: OrderAuditEntry[],
): OrderActionResult {
  if (role !== "Admin") {
    return { ok: false, message: "僅管理者可重開已確認訂單。" };
  }
  if (order.Order_Status !== "Confirmed") {
    return {
      ok: false,
      message: `僅已確認訂單可重開（目前 ${statusLabelZh(order.Order_Status)}）。`,
    };
  }
  const trimmed = reason.trim();
  if (!trimmed) {
    return { ok: false, message: "重開須填寫原因。" };
  }
  if (order.Stock_Deducted) {
    return {
      ok: false,
      message: "已出貨訂單請先取消出貨後再重開。",
    };
  }
  const audit: OrderAuditEntry = {
    Audit_ID: nextAuditId(audits),
    Order_ID: order.Order_ID,
    At: new Date().toISOString(),
    User_ID: user.User_ID,
    User_Name: user.User_Name,
    Action: "重開",
    Reason: trimmed,
    Before: "Confirmed",
    After: "Draft",
  };
  return {
    ok: true,
    message: "已重開為草稿。",
    order: {
      ...order,
      Order_Status: "Draft",
      Reopen_Reason: trimmed,
    },
    audit,
  };
}

export const ORDER_STATUS_RULES_ZH = [
  "草稿 Draft：可改數量／交期／配送／備註；可確認或取消",
  "已確認 Confirmed：Staff 不可改；Admin 可填原因重開或取消",
  "已取消 Cancelled：終態，不可再確認或刪除",
  "確認訂單不扣庫存、不建應收（出貨才扣庫，第 10／11／12 週）",
] as const;

/** @deprecated 舊單日交期 helper */
export function defaultDeliveryDate(
  orderDate: string = todayLocalDate(),
  leadDays = 5,
): string {
  return addDays(orderDate, leadDays);
}

export function ensureOrderDeliveryDate(order: SalesOrder): SalesOrder {
  return ensureOrderShape(order);
}

export function validateDeliveryDate(
  deliveryDate: string,
  orderDate: string,
): { ok: boolean; message?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate.trim())) {
    return { ok: false, message: "交期格式須為 YYYY-MM-DD。" };
  }
  if (deliveryDate.trim() < orderDate) {
    return { ok: false, message: "交期不可早於訂單日期。" };
  }
  return { ok: true };
}
