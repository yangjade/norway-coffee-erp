import type {
  Payment,
  Quotation,
  Receivable,
  SalesOrder,
  StockMove,
} from "./types";

export type ActivityKind =
  | "order"
  | "quote"
  | "ship"
  | "payment"
  | "stock"
  | "ar";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  detail: string;
  href: string;
};

function kindLabel(kind: ActivityKind): string {
  switch (kind) {
    case "order":
      return "訂單";
    case "quote":
      return "報價";
    case "ship":
      return "出貨";
    case "payment":
      return "收款";
    case "stock":
      return "庫存";
    case "ar":
      return "應收";
  }
}

export { kindLabel };

/** 由現有本機資料組出「近期動態」時間軸（教學級近似） */
export function buildActivityFeed(input: {
  orders: SalesOrder[];
  quotations: Quotation[];
  receivables: Receivable[];
  payments: Payment[];
  stockMoves: StockMove[];
  customerName: (id: string) => string;
  limit?: number;
}): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const o of input.orders) {
    items.push({
      id: `order-${o.Order_ID}`,
      kind: o.Order_Status === "已出貨" ? "ship" : "order",
      at: o.Order_Date,
      title:
        o.Order_Status === "已出貨"
          ? `出貨完成 ${o.Order_ID}`
          : `訂單 ${o.Order_ID} · ${o.Order_Status}`,
      detail: `${input.customerName(o.Customer_ID)} · NT$ ${o.Total_Amount.toLocaleString("zh-TW")}`,
      href: `/orders/${o.Order_ID}/`,
    });
  }

  for (const q of input.quotations) {
    const stamp = (q.Updated_At || q.Created_At || q.Quote_Date).slice(0, 10);
    items.push({
      id: `quote-${q.Quote_ID}`,
      kind: "quote",
      at: stamp,
      title: `報價 ${q.Quote_ID} · ${q.Status}`,
      detail: `${input.customerName(q.Customer_ID)} · NT$ ${q.Total.toLocaleString("zh-TW")}`,
      href: `/quotations/${q.Quote_ID}/`,
    });
  }

  for (const p of input.payments) {
    items.push({
      id: `pay-${p.Payment_ID}`,
      kind: "payment",
      at: p.Pay_Date,
      title: `收款 ${p.Payment_ID}`,
      detail: `${p.AR_ID} · NT$ ${p.Amount.toLocaleString("zh-TW")}`,
      href: "/receivables/",
    });
  }

  for (const r of input.receivables) {
    if (r.Status === "已作廢") continue;
    items.push({
      id: `ar-${r.AR_ID}`,
      kind: "ar",
      at: r.Invoice_Date,
      title: `應收 ${r.AR_ID} · ${r.Status}`,
      detail: `${input.customerName(r.Customer_ID)} · 餘額 NT$ ${(r.Amount - r.Paid_Amount).toLocaleString("zh-TW")}`,
      href: "/receivables/",
    });
  }

  for (const m of input.stockMoves) {
    items.push({
      id: `move-${m.Move_ID}`,
      kind: "stock",
      at: m.Move_Date,
      title: `${m.Reason} ${m.Product_ID}`,
      detail: `數量 ${m.Qty}${m.Ref_Order_ID ? ` · ${m.Ref_Order_ID}` : ""}`,
      href: "/inventory/",
    });
  }

  items.sort((a, b) => {
    const d = b.at.localeCompare(a.at);
    return d !== 0 ? d : b.id.localeCompare(a.id);
  });

  return items.slice(0, input.limit ?? 12);
}
