import type {
  Customer,
  CustomerCreateInput,
  CustomerType,
  CustomerUpdateInput,
  PaymentTerms,
  Role,
} from "./types";

export const CUSTOMER_TYPES: CustomerType[] = ["零售", "批發", "企業"];
export const PAYMENT_TERMS: PaymentTerms[] = ["現結", "月結30天"];
export const NOTES_MAX = 200;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Partial<
  Record<
    | "Customer_ID"
    | "Customer_Name"
    | "Customer_Type"
    | "Phone"
    | "Email"
    | "Payment_Terms"
    | "Credit_Limit"
    | "Notes"
    | "form",
    string
  >
>;

export interface ActionResult {
  ok: boolean;
  message?: string;
  errors?: FieldErrors;
  customer?: Customer;
}

/** 以既有最大流水號 +1 產生下一 Customer_ID（非列表長度） */
export function nextCustomerId(customers: Customer[]): string {
  let max = 0;
  for (const c of customers) {
    const m = /^C(\d+)$/i.exec(c.Customer_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  const next = max + 1;
  return `C${String(next).padStart(3, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseCreditLimit(raw: unknown): {
  ok: boolean;
  value?: number;
  error?: string;
} {
  if (raw === "" || raw === null || raw === undefined) {
    return { ok: true, value: 0 };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
      return {
        ok: false,
        error: "信用額度須為非負整數（不可為負數、文字或小數）。",
      };
    }
    return { ok: true, value: raw };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s === "") return { ok: true, value: 0 };
    if (!/^\d+$/.test(s)) {
      return {
        ok: false,
        error: "信用額度須為非負整數（不可為負數、文字或小數）。",
      };
    }
    return { ok: true, value: Number.parseInt(s, 10) };
  }
  return {
    ok: false,
    error: "信用額度須為非負整數（不可為負數、文字或小數）。",
  };
}

export function validateCustomerFields(
  input: {
    Customer_Name?: string;
    Customer_Type?: string;
    Phone?: string;
    Email?: string;
    Payment_Terms?: string;
    Credit_Limit?: unknown;
    Notes?: string;
  },
  opts: { requireName?: boolean } = {},
): FieldErrors {
  const errors: FieldErrors = {};
  const requireName = opts.requireName !== false;

  if (input.Customer_Name !== undefined || requireName) {
    const name = trimStr(input.Customer_Name);
    if (!name) {
      errors.Customer_Name = "客戶名稱為必填，去除空白後不可為空。";
    }
  }

  if (input.Customer_Type !== undefined) {
    if (!CUSTOMER_TYPES.includes(input.Customer_Type as CustomerType)) {
      errors.Customer_Type = "客戶分類須為零售／批發／企業。";
    }
  }

  if (input.Email !== undefined) {
    const email = trimStr(input.Email);
    if (email && !EMAIL_RE.test(email)) {
      errors.Email = "電子郵件格式不正確。";
    }
  }

  if (input.Payment_Terms !== undefined) {
    if (!PAYMENT_TERMS.includes(input.Payment_Terms as PaymentTerms)) {
      errors.Payment_Terms = "付款條件須為現結或月結30天。";
    }
  }

  if (input.Credit_Limit !== undefined) {
    const parsed = parseCreditLimit(input.Credit_Limit);
    if (!parsed.ok) {
      errors.Credit_Limit = parsed.error;
    }
  }

  if (input.Notes !== undefined && typeof input.Notes === "string") {
    if (input.Notes.length > NOTES_MAX) {
      errors.Notes = `備註最多 ${NOTES_MAX} 字。`;
    }
  }

  const terms =
    input.Payment_Terms !== undefined
      ? (input.Payment_Terms as PaymentTerms)
      : undefined;
  if (terms === "現結" && input.Credit_Limit !== undefined) {
    const parsed = parseCreditLimit(input.Credit_Limit);
    if (parsed.ok && parsed.value !== 0) {
      errors.Credit_Limit = "現結時信用額度必須為 0。";
    }
  }

  return errors;
}

/** 同名僅提示，不阻擋儲存 */
export function findDuplicateNameHint(
  customers: Customer[],
  name: string,
  excludeId?: string,
): string | null {
  const n = name.trim();
  if (!n) return null;
  const hit = customers.find(
    (c) =>
      c.Customer_ID !== excludeId &&
      c.Customer_Name.trim().toLowerCase() === n.toLowerCase(),
  );
  return hit
    ? `提示：已有同名客戶 ${hit.Customer_ID}「${hit.Customer_Name}」，請人工確認是否為同一人（不會自動合併）。`
    : null;
}

const STAFF_FIELDS = new Set([
  "Customer_Name",
  "Customer_Type",
  "Phone",
  "Email",
  "Notes",
  "Contact",
]);

const ADMIN_ONLY_FIELDS = new Set([
  "Payment_Terms",
  "Credit_Limit",
  "Is_Active",
]);

/**
 * 操作層欄位守衛：Staff 嘗試寫入受限欄位 → 整次操作拒絕、原值不變。
 */
export function assertWritablePatch(
  role: Role,
  patch: CustomerUpdateInput,
): ActionResult {
  const keys = Object.keys(patch).filter(
    (k) => patch[k as keyof CustomerUpdateInput] !== undefined,
  );
  if (keys.length === 0) {
    return { ok: false, message: "沒有可更新的欄位。", errors: { form: "沒有可更新的欄位。" } };
  }

  if (keys.includes("Customer_ID" as string)) {
    return {
      ok: false,
      message: "Customer_ID 建立後不可修改。",
      errors: { Customer_ID: "Customer_ID 建立後不可修改。" },
    };
  }

  if (role === "Staff") {
    const forbidden = keys.filter((k) => ADMIN_ONLY_FIELDS.has(k));
    if (forbidden.length > 0) {
      return {
        ok: false,
        message: `目前角色無法修改：${forbidden.join("、")}（僅系統管理者）。`,
        errors: { form: `無權限修改欄位：${forbidden.join("、")}` },
      };
    }
    const unknown = keys.filter((k) => !STAFF_FIELDS.has(k));
    if (unknown.length > 0) {
      return {
        ok: false,
        message: `不允許更新欄位：${unknown.join("、")}`,
        errors: { form: `不允許更新欄位：${unknown.join("、")}` },
      };
    }
  }

  return { ok: true };
}

export function buildNewCustomer(
  id: string,
  input: CustomerCreateInput,
  role: Role,
): { customer?: Customer; errors?: FieldErrors; message?: string } {
  const name = trimStr(input.Customer_Name);
  const type = (input.Customer_Type ?? "零售") as CustomerType;
  const phone = typeof input.Phone === "string" ? input.Phone : "";
  const email = trimStr(input.Email);
  const notes = typeof input.Notes === "string" ? input.Notes : "";
  const contact =
    typeof input.Contact === "string" ? input.Contact.trim() : undefined;

  let terms: PaymentTerms = "現結";
  let credit = 0;
  let active = true;

  if (role === "Admin") {
    terms = (input.Payment_Terms ?? "現結") as PaymentTerms;
    const parsed = parseCreditLimit(input.Credit_Limit ?? 0);
    if (!parsed.ok) {
      return {
        errors: { Credit_Limit: parsed.error },
        message: parsed.error,
      };
    }
    credit = parsed.value ?? 0;
    if (input.Is_Active !== undefined) active = Boolean(input.Is_Active);
  }
  // Staff：強制現結／0／啟用（即使傳入也不採用）

  const errors = validateCustomerFields(
    {
      Customer_Name: name,
      Customer_Type: type,
      Phone: phone,
      Email: email,
      Payment_Terms: terms,
      Credit_Limit: credit,
      Notes: notes,
    },
    { requireName: true },
  );

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      message: Object.values(errors)[0],
    };
  }

  const ts = nowIso();
  const customer: Customer = {
    Customer_ID: id,
    Customer_Name: name,
    Customer_Type: type,
    Phone: phone,
    Email: email,
    Payment_Terms: terms,
    Credit_Limit: credit,
    Is_Active: active,
    Notes: notes,
    ...(contact ? { Contact: contact } : {}),
    Created_At: ts,
    Updated_At: ts,
  };

  return { customer };
}

export function applyCustomerPatch(
  existing: Customer,
  patch: CustomerUpdateInput,
  role: Role,
): { customer?: Customer; errors?: FieldErrors; message?: string } {
  const guard = assertWritablePatch(role, patch);
  if (!guard.ok) return { errors: guard.errors, message: guard.message };

  const nextName =
    patch.Customer_Name !== undefined
      ? trimStr(patch.Customer_Name)
      : existing.Customer_Name;
  const nextType =
    patch.Customer_Type !== undefined
      ? patch.Customer_Type
      : existing.Customer_Type;
  const nextPhone =
    patch.Phone !== undefined ? patch.Phone : existing.Phone;
  const nextEmail =
    patch.Email !== undefined ? trimStr(patch.Email) : existing.Email;
  const nextNotes =
    patch.Notes !== undefined ? patch.Notes : existing.Notes;

  let nextTerms = existing.Payment_Terms;
  let nextCredit = existing.Credit_Limit;
  let nextActive = existing.Is_Active;

  if (role === "Admin") {
    if (patch.Payment_Terms !== undefined) nextTerms = patch.Payment_Terms;
    if (patch.Credit_Limit !== undefined) {
      const parsed = parseCreditLimit(patch.Credit_Limit);
      if (!parsed.ok) {
        return {
          errors: { Credit_Limit: parsed.error },
          message: parsed.error,
        };
      }
      nextCredit = parsed.value ?? 0;
    }
    if (patch.Is_Active !== undefined) nextActive = Boolean(patch.Is_Active);
  }

  const errors = validateCustomerFields(
    {
      Customer_Name: nextName,
      Customer_Type: nextType,
      Phone: nextPhone,
      Email: nextEmail,
      Payment_Terms: nextTerms,
      Credit_Limit: nextCredit,
      Notes: nextNotes,
    },
    { requireName: true },
  );

  if (Object.keys(errors).length > 0) {
    return { errors, message: Object.values(errors)[0] };
  }

  const customer: Customer = {
    ...existing,
    Customer_Name: nextName,
    Customer_Type: nextType,
    Phone: nextPhone,
    Email: nextEmail,
    Notes: nextNotes,
    Payment_Terms: nextTerms,
    Credit_Limit: nextCredit,
    Is_Active: nextActive,
    Updated_At: nowIso(),
  };

  if (patch.Contact !== undefined) {
    customer.Contact = patch.Contact.trim();
  }

  return { customer };
}

export function activeLabel(active: boolean): string {
  return active ? "啟用" : "停用";
}

export function formatCredit(limit: number): string {
  return new Intl.NumberFormat("zh-TW").format(limit);
}
