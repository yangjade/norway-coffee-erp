import { todayLocalDate } from "./quotation-rules";
import type {
  Payment,
  Receivable,
  ReceivableStatus,
  Role,
  SalesOrder,
} from "./types";

export type ArActionResult = {
  ok: boolean;
  message?: string;
  receivable?: Receivable;
  receivables?: Receivable[];
  payments?: Payment[];
  payment?: Payment;
};

export function nextArId(list: Receivable[]): string {
  let max = 0;
  for (const r of list) {
    const m = /^AR(\d+)$/i.exec(r.AR_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `AR${String(max + 1).padStart(3, "0")}`;
}

export function nextPaymentId(list: Payment[]): string {
  let max = 0;
  for (const p of list) {
    const m = /^PAY(\d+)$/i.exec(p.Payment_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `PAY${String(max + 1).padStart(3, "0")}`;
}

export function outstandingOf(ar: Receivable): number {
  return Math.max(0, ar.Amount - ar.Paid_Amount);
}

export function deriveArStatus(
  amount: number,
  paid: number,
  current?: ReceivableStatus,
): ReceivableStatus {
  if (current === "已作廢") return "已作廢";
  if (paid <= 0) return "未收";
  if (paid >= amount) return "已結清";
  return "部分收款";
}

/** 已出貨訂單產生應收（若尚無） */
export function ensureReceivableForOrder(
  order: SalesOrder,
  receivables: Receivable[],
): ArActionResult {
  const existing = receivables.find(
    (r) => r.Order_ID === order.Order_ID && r.Status !== "已作廢",
  );
  if (existing) {
    return {
      ok: true,
      message: `應收已存在：${existing.AR_ID}`,
      receivable: existing,
      receivables,
    };
  }
  if (order.Order_Status !== "已出貨") {
    return {
      ok: false,
      message: "僅「已出貨」訂單可建立應收。",
    };
  }
  const ar: Receivable = {
    AR_ID: nextArId(receivables),
    Order_ID: order.Order_ID,
    Customer_ID: order.Customer_ID,
    Invoice_Date: todayLocalDate(),
    Amount: order.Total_Amount,
    Paid_Amount: 0,
    Status: "未收",
    Notes: order.Quote_ID
      ? `由訂單 ${order.Order_ID}（報價 ${order.Quote_ID}）出貨產生`
      : `由訂單 ${order.Order_ID} 出貨產生`,
  };
  return {
    ok: true,
    message: `已建立應收 ${ar.AR_ID}`,
    receivable: ar,
    receivables: [...receivables, ar],
  };
}

/** 取消出貨時：若無收款則作廢應收；有收款則阻擋 */
export function voidReceivableForUnship(
  orderId: string,
  receivables: Receivable[],
  payments: Payment[],
): ArActionResult {
  const ar = receivables.find(
    (r) => r.Order_ID === orderId && r.Status !== "已作廢",
  );
  if (!ar) {
    return { ok: true, message: "無應收需處理。", receivables, payments };
  }
  const paid = payments
    .filter((p) => p.AR_ID === ar.AR_ID)
    .reduce((s, p) => s + p.Amount, 0);
  if (paid > 0 || ar.Paid_Amount > 0) {
    return {
      ok: false,
      message: `應收 ${ar.AR_ID} 已有收款紀錄，無法取消出貨。請先維持已出貨或另行處理。`,
      receivable: ar,
      receivables,
      payments,
    };
  }
  const next = receivables.map((r) =>
    r.AR_ID === ar.AR_ID
      ? { ...r, Status: "已作廢" as const, Notes: `${r.Notes ?? ""}｜取消出貨作廢`.trim() }
      : r,
  );
  return {
    ok: true,
    message: `已作廢應收 ${ar.AR_ID}`,
    receivable: { ...ar, Status: "已作廢" },
    receivables: next,
    payments,
  };
}

export function recordPayment(
  arId: string,
  amountRaw: number | string,
  payDate: string,
  note: string | undefined,
  receivables: Receivable[],
  payments: Payment[],
  role: Role,
): ArActionResult {
  if (role !== "Admin" && role !== "Staff") {
    return { ok: false, message: "無權限登記收款。" };
  }
  const ar = receivables.find((r) => r.AR_ID === arId);
  if (!ar) return { ok: false, message: "找不到該應收。" };
  if (ar.Status === "已作廢") {
    return { ok: false, message: "已作廢應收不可收款。" };
  }
  if (ar.Status === "已結清") {
    return { ok: false, message: "此應收已結清。" };
  }

  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : Number.parseInt(String(amountRaw).trim(), 10);
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, message: "收款金額須為正整數。" };
  }
  const due = outstandingOf(ar);
  if (amount > due) {
    return {
      ok: false,
      message: `收款不可超過未收餘額 NT$ ${due.toLocaleString("zh-TW")}。`,
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
    return { ok: false, message: "收款日格式須為 YYYY-MM-DD。" };
  }

  const payment: Payment = {
    Payment_ID: nextPaymentId(payments),
    AR_ID: arId,
    Pay_Date: payDate,
    Amount: amount,
    Note: note?.trim() || undefined,
  };
  const paid = ar.Paid_Amount + amount;
  const status = deriveArStatus(ar.Amount, paid);
  const nextAr: Receivable = { ...ar, Paid_Amount: paid, Status: status };
  const nextReceivables = receivables.map((r) =>
    r.AR_ID === arId ? nextAr : r,
  );

  return {
    ok: true,
    message: `已登記收款 ${payment.Payment_ID}（${status}）`,
    payment,
    receivable: nextAr,
    receivables: nextReceivables,
    payments: [...payments, payment],
  };
}
