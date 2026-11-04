import type {
  Customer,
  Product,
  Quotation,
  QuotationCreateInput,
  QuotationDetail,
  QuotationDetailInput,
  QuotationUpdateInput,
  QuoteStatus,
  Role,
} from "./types";

export const TAX_RATE = 0.05;
export const QUOTE_STATUSES: QuoteStatus[] = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
];

export type QuoteFieldErrors = Partial<
  Record<
    | "Quote_ID"
    | "Customer_ID"
    | "Quote_Date"
    | "Valid_Until"
    | "Discount_Amount"
    | "lines"
    | "form",
    string
  >
>;

export interface QuoteActionResult {
  ok: boolean;
  message?: string;
  errors?: QuoteFieldErrors;
  quotation?: Quotation;
  details?: QuotationDetail[];
}

export function nextQuoteId(quotes: Quotation[]): string {
  let max = 0;
  for (const q of quotes) {
    const m = /^Q(\d+)$/i.exec(q.Quote_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `Q${String(max + 1).padStart(3, "0")}`;
}

export function todayLocalDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function parseMoney(raw: unknown, label: string): {
  ok: boolean;
  value?: number;
  error?: string;
} {
  if (raw === "" || raw === null || raw === undefined) {
    return { ok: true, value: 0 };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0 || !Number.isInteger(raw)) {
      return { ok: false, error: `${label}須為非負整數。` };
    }
    return { ok: true, value: raw };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "") return { ok: true, value: 0 };
    if (!/^\d+$/.test(s)) {
      return { ok: false, error: `${label}須為非負整數。` };
    }
    return { ok: true, value: Number.parseInt(s, 10) };
  }
  return { ok: false, error: `${label}須為非負整數。` };
}

/**
 * Subtotal = Σ(Qty×Unit_Price)
 * Taxable = Subtotal − Discount_Amount
 * Tax_Amount = round(Taxable × 0.05) 依元四捨五入
 * Total = Taxable + Tax_Amount
 */
export function computeQuoteTotals(
  lines: { Qty: number; Unit_Price: number }[],
  discountAmount: number,
): { Subtotal: number; Tax_Amount: number; Total: number; Taxable_Base: number } {
  const Subtotal = lines.reduce(
    (sum, l) => sum + l.Qty * l.Unit_Price,
    0,
  );
  const disc = Math.min(Math.max(0, discountAmount), Subtotal);
  const Taxable_Base = Subtotal - disc;
  const Tax_Amount = Math.round(Taxable_Base * TAX_RATE);
  const Total = Taxable_Base + Tax_Amount;
  return { Subtotal, Tax_Amount, Total, Taxable_Base };
}

export function statusLabel(s: QuoteStatus): string {
  const map: Record<QuoteStatus, string> = {
    Draft: "草稿",
    Sent: "已送出",
    Accepted: "已接受",
    Rejected: "已拒絕",
    Expired: "已到期",
  };
  return map[s];
}

export function isAmountLocked(status: QuoteStatus): boolean {
  return status !== "Draft";
}

function buildLines(
  lines: QuotationDetailInput[],
  quoteId: string,
  products: Product[],
  role: Role,
): { details?: QuotationDetail[]; error?: string } {
  if (!lines.length) {
    return { error: "至少需要一筆明細。" };
  }
  const details: QuotationDetail[] = [];
  let lineNo = 1;
  for (const line of lines) {
    const product = products.find((p) => p.Product_ID === line.Product_ID);
    if (!product) {
      return { error: `找不到商品 ${line.Product_ID}。` };
    }
    if (!product.Is_Active) {
      return { error: `停用商品 ${line.Product_ID} 不可加入新報價。` };
    }
    const qty = line.Qty;
    if (!Number.isInteger(qty) || qty <= 0) {
      return { error: "數量須為大於 0 的整數。" };
    }
    let unitPrice = product.List_Price;
    if (role === "Admin" && line.Unit_Price !== undefined) {
      if (
        !Number.isInteger(line.Unit_Price) ||
        line.Unit_Price < 0 ||
        !Number.isFinite(line.Unit_Price)
      ) {
        return { error: "單價須為非負整數。" };
      }
      unitPrice = line.Unit_Price;
    }
    // Staff：強制用 List_Price 快照，不可改預設單價
    details.push({
      Quote_ID: quoteId,
      Line_No: lineNo,
      Product_ID: product.Product_ID,
      Product_Name_Snapshot: product.Product_Name,
      Qty: qty,
      Unit_Price: unitPrice,
      Line_Amount: qty * unitPrice,
    });
    lineNo += 1;
  }
  return { details };
}

export function createQuotation(
  id: string,
  input: QuotationCreateInput,
  role: Role,
  customers: Customer[],
  products: Product[],
): QuoteActionResult {
  const customer = customers.find((c) => c.Customer_ID === input.Customer_ID);
  if (!customer) {
    return {
      ok: false,
      message: "找不到該客戶。",
      errors: { Customer_ID: "找不到該客戶。" },
    };
  }
  if (!customer.Is_Active) {
    return {
      ok: false,
      message: "停用客戶不可建立新報價。",
      errors: { Customer_ID: "停用客戶不可建立新報價。" },
    };
  }
  if (!input.Quote_Date || !/^\d{4}-\d{2}-\d{2}$/.test(input.Quote_Date)) {
    return {
      ok: false,
      message: "報價日期格式不正確。",
      errors: { Quote_Date: "報價日期格式不正確。" },
    };
  }
  if (!input.Valid_Until || !/^\d{4}-\d{2}-\d{2}$/.test(input.Valid_Until)) {
    return {
      ok: false,
      message: "有效期限格式不正確。",
      errors: { Valid_Until: "有效期限格式不正確。" },
    };
  }
  if (input.Valid_Until < input.Quote_Date) {
    return {
      ok: false,
      message: "有效期限不可早於報價日期。",
      errors: { Valid_Until: "有效期限不可早於報價日期。" },
    };
  }
  const disc = parseMoney(input.Discount_Amount ?? 0, "Discount_Amount");
  if (!disc.ok) {
    return {
      ok: false,
      message: disc.error,
      errors: { Discount_Amount: disc.error },
    };
  }

  const built = buildLines(input.lines, id, products, role);
  if (!built.details) {
    return {
      ok: false,
      message: built.error,
      errors: { lines: built.error },
    };
  }

  const totals = computeQuoteTotals(built.details, disc.value ?? 0);
  if ((disc.value ?? 0) > totals.Subtotal) {
    return {
      ok: false,
      message: "整單折扣不可大於小計。",
      errors: { Discount_Amount: "整單折扣不可大於小計。" },
    };
  }

  const ts = new Date().toISOString();
  const quotation: Quotation = {
    Quote_ID: id,
    Customer_ID: input.Customer_ID,
    Quote_Date: input.Quote_Date,
    Valid_Until: input.Valid_Until,
    Status: "Draft",
    Discount_Amount: disc.value ?? 0,
    Tax_Rate: TAX_RATE,
    Subtotal: totals.Subtotal,
    Tax_Amount: totals.Tax_Amount,
    Total: totals.Total,
    Notes: typeof input.Notes === "string" ? input.Notes : "",
    Created_At: ts,
    Updated_At: ts,
  };
  return { ok: true, quotation, details: built.details, message: `已建立 ${id}` };
}

export function updateDraftQuotation(
  existing: Quotation,
  existingDetails: QuotationDetail[],
  input: QuotationUpdateInput,
  role: Role,
  products: Product[],
): QuoteActionResult {
  if (existing.Status !== "Draft") {
    return {
      ok: false,
      message: "僅 Draft 可修改金額與明細；Sent 後請開新報價。",
      errors: { form: "僅 Draft 可修改。" },
    };
  }
  const quoteDate = input.Quote_Date ?? existing.Quote_Date;
  const validUntil = input.Valid_Until ?? existing.Valid_Until;
  if (validUntil < quoteDate) {
    return {
      ok: false,
      message: "有效期限不可早於報價日期。",
      errors: { Valid_Until: "有效期限不可早於報價日期。" },
    };
  }
  const discParsed = parseMoney(
    input.Discount_Amount !== undefined
      ? input.Discount_Amount
      : existing.Discount_Amount,
    "Discount_Amount",
  );
  if (!discParsed.ok) {
    return {
      ok: false,
      message: discParsed.error,
      errors: { Discount_Amount: discParsed.error },
    };
  }

  let details = existingDetails;
  if (input.lines) {
    const built = buildLines(input.lines, existing.Quote_ID, products, role);
    if (!built.details) {
      return {
        ok: false,
        message: built.error,
        errors: { lines: built.error },
      };
    }
    details = built.details;
  }

  const totals = computeQuoteTotals(details, discParsed.value ?? 0);
  const quotation: Quotation = {
    ...existing,
    Quote_Date: quoteDate,
    Valid_Until: validUntil,
    Discount_Amount: discParsed.value ?? 0,
    Tax_Rate: TAX_RATE,
    Subtotal: totals.Subtotal,
    Tax_Amount: totals.Tax_Amount,
    Total: totals.Total,
    Notes:
      input.Notes !== undefined ? input.Notes : (existing.Notes ?? ""),
    Updated_At: new Date().toISOString(),
  };
  return { ok: true, quotation, details, message: "已儲存草稿。" };
}

export function transitionQuoteStatus(
  existing: Quotation,
  next: QuoteStatus,
  role: Role,
): QuoteActionResult {
  const from = existing.Status;
  if (from === next) {
    return { ok: true, quotation: existing, message: `狀態已是 ${next}` };
  }

  const allowed: Record<QuoteStatus, QuoteStatus[]> = {
    Draft: ["Sent"],
    Sent: ["Accepted", "Rejected", "Expired"],
    Accepted: [],
    Rejected: [],
    Expired: [],
  };

  if (!allowed[from].includes(next)) {
    return {
      ok: false,
      message: `不可由 ${from} 轉為 ${next}。`,
      errors: { form: `不可由 ${from} 轉為 ${next}。` },
    };
  }

  if (next === "Sent") {
    // Admin + Staff 皆可送出
  } else if (next === "Accepted" || next === "Rejected" || next === "Expired") {
    if (role !== "Admin") {
      return {
        ok: false,
        message: "目前角色無法接受／拒絕／標示到期（僅系統管理者）。",
        errors: { form: "無權限變更為 Accepted／Rejected／Expired。" },
      };
    }
  }

  return {
    ok: true,
    quotation: {
      ...existing,
      Status: next,
      Updated_At: new Date().toISOString(),
    },
    message: `狀態已更新為 ${next}`,
  };
}

/** Sent 且 Valid_Until < 基準日 → Expired（系統掃描） */
export function applyExpiryScan(
  quotations: Quotation[],
  asOfDate: string = todayLocalDate(),
): { quotations: Quotation[]; changedIds: string[] } {
  const changedIds: string[] = [];
  const next = quotations.map((q) => {
    if (q.Status === "Sent" && q.Valid_Until < asOfDate) {
      changedIds.push(q.Quote_ID);
      return {
        ...q,
        Status: "Expired" as const,
        Updated_At: new Date().toISOString(),
      };
    }
    return q;
  });
  return { quotations: next, changedIds };
}
