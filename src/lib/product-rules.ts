import type {
  Product,
  ProductCreateInput,
  ProductUpdateInput,
  Role,
} from "./types";

export const PRODUCT_CATEGORIES = [
  "咖啡豆",
  "濾掛",
  "飲品",
  "甜點",
  "飲品原料",
  "禮盒",
] as const;

export const DESC_MAX = 200;

export type ProductFieldErrors = Partial<
  Record<
    | "Product_ID"
    | "Product_Name"
    | "Category"
    | "Unit"
    | "List_Price"
    | "Cost"
    | "Description"
    | "form",
    string
  >
>;

export interface ProductActionResult {
  ok: boolean;
  message?: string;
  errors?: ProductFieldErrors;
  product?: Product;
}

export function nextProductId(products: Product[]): string {
  let max = 0;
  for (const p of products) {
    const m = /^P(\d+)$/i.exec(p.Product_ID.trim());
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return `P${String(max + 1).padStart(3, "0")}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseNonNegInt(raw: unknown, label: string): {
  ok: boolean;
  value?: number;
  error?: string;
} {
  if (raw === "" || raw === null || raw === undefined) {
    return { ok: false, error: `${label}為必填。` };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
      return { ok: false, error: `${label}須為非負整數。` };
    }
    return { ok: true, value: raw };
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!/^\d+$/.test(s)) {
      return { ok: false, error: `${label}須為非負整數。` };
    }
    return { ok: true, value: Number.parseInt(s, 10) };
  }
  return { ok: false, error: `${label}須為非負整數。` };
}

const STAFF_FIELDS = new Set([
  "Product_Name",
  "Description",
  "Category",
  "Unit",
]);

const ADMIN_ONLY = new Set(["List_Price", "Cost", "Is_Active"]);

export function assertProductWritablePatch(
  role: Role,
  patch: ProductUpdateInput,
): ProductActionResult {
  const keys = Object.keys(patch).filter(
    (k) => patch[k as keyof ProductUpdateInput] !== undefined,
  );
  if (keys.length === 0) {
    return { ok: false, message: "沒有可更新的欄位。", errors: { form: "沒有可更新的欄位。" } };
  }
  if (keys.includes("Product_ID")) {
    return {
      ok: false,
      message: "Product_ID 建立後不可修改。",
      errors: { Product_ID: "Product_ID 建立後不可修改。" },
    };
  }
  if (role === "Staff") {
    const forbidden = keys.filter((k) => ADMIN_ONLY.has(k));
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

export function validateProductFields(input: {
  Product_Name?: string;
  Category?: string;
  Unit?: string;
  List_Price?: unknown;
  Cost?: unknown;
  Description?: string;
}): ProductFieldErrors {
  const errors: ProductFieldErrors = {};
  if (input.Product_Name !== undefined) {
    if (!trimStr(input.Product_Name)) {
      errors.Product_Name = "商品名稱為必填，去除空白後不可為空。";
    }
  }
  if (input.Category !== undefined && !trimStr(input.Category)) {
    errors.Category = "分類不可為空。";
  }
  if (input.Unit !== undefined && !trimStr(input.Unit)) {
    errors.Unit = "單位不可為空。";
  }
  if (input.List_Price !== undefined) {
    const p = parseNonNegInt(input.List_Price, "List_Price");
    if (!p.ok) errors.List_Price = p.error;
  }
  if (input.Cost !== undefined) {
    const p = parseNonNegInt(input.Cost, "Cost");
    if (!p.ok) errors.Cost = p.error;
  }
  if (input.Description !== undefined && typeof input.Description === "string") {
    if (input.Description.length > DESC_MAX) {
      errors.Description = `說明最多 ${DESC_MAX} 字。`;
    }
  }
  return errors;
}

export function buildNewProduct(
  id: string,
  input: ProductCreateInput,
  role: Role,
): { product?: Product; errors?: ProductFieldErrors; message?: string } {
  const name = trimStr(input.Product_Name);
  const category = trimStr(input.Category) || "咖啡豆";
  const unit = trimStr(input.Unit) || "包";
  const description =
    typeof input.Description === "string" ? input.Description : "";

  let listPrice = 0;
  let cost = 0;
  let active = true;

  if (role === "Admin") {
    const lp = parseNonNegInt(input.List_Price ?? 0, "List_Price");
    if (!lp.ok) return { errors: { List_Price: lp.error }, message: lp.error };
    listPrice = lp.value ?? 0;
    const c = parseNonNegInt(input.Cost ?? 0, "Cost");
    if (!c.ok) return { errors: { Cost: c.error }, message: c.error };
    cost = c.value ?? 0;
    if (input.Is_Active !== undefined) active = Boolean(input.Is_Active);
  } else {
    // Staff 可新增：預設牌價／成本 0，啟用；之後由 Admin 定價
    listPrice = 0;
    cost = 0;
    active = true;
  }

  const errors = validateProductFields({
    Product_Name: name,
    Category: category,
    Unit: unit,
    List_Price: listPrice,
    Cost: cost,
    Description: description,
  });
  if (Object.keys(errors).length > 0) {
    return { errors, message: Object.values(errors)[0] };
  }

  const ts = nowIso();
  return {
    product: {
      Product_ID: id,
      Product_Name: name,
      Category: category,
      Unit: unit,
      List_Price: listPrice,
      Cost: cost,
      On_Hand: 0,
      Is_Active: active,
      Description: description,
      Created_At: ts,
      Updated_At: ts,
    },
  };
}

export function applyProductPatch(
  existing: Product,
  patch: ProductUpdateInput,
  role: Role,
): { product?: Product; errors?: ProductFieldErrors; message?: string } {
  const guard = assertProductWritablePatch(role, patch);
  if (!guard.ok) return { errors: guard.errors, message: guard.message };

  const nextName =
    patch.Product_Name !== undefined
      ? trimStr(patch.Product_Name)
      : existing.Product_Name;
  const nextCategory =
    patch.Category !== undefined
      ? trimStr(patch.Category)
      : existing.Category;
  const nextUnit =
    patch.Unit !== undefined ? trimStr(patch.Unit) : existing.Unit;
  const nextDesc =
    patch.Description !== undefined
      ? patch.Description
      : existing.Description;

  let nextList = existing.List_Price;
  let nextCost = existing.Cost;
  let nextActive = existing.Is_Active;

  if (role === "Admin") {
    if (patch.List_Price !== undefined) {
      const p = parseNonNegInt(patch.List_Price, "List_Price");
      if (!p.ok) return { errors: { List_Price: p.error }, message: p.error };
      nextList = p.value ?? 0;
    }
    if (patch.Cost !== undefined) {
      const p = parseNonNegInt(patch.Cost, "Cost");
      if (!p.ok) return { errors: { Cost: p.error }, message: p.error };
      nextCost = p.value ?? 0;
    }
    if (patch.Is_Active !== undefined) nextActive = Boolean(patch.Is_Active);
  }

  const errors = validateProductFields({
    Product_Name: nextName,
    Category: nextCategory,
    Unit: nextUnit,
    List_Price: nextList,
    Cost: nextCost,
    Description: nextDesc,
  });
  if (Object.keys(errors).length > 0) {
    return { errors, message: Object.values(errors)[0] };
  }

  return {
    product: {
      ...existing,
      Product_Name: nextName,
      Category: nextCategory,
      Unit: nextUnit,
      Description: nextDesc,
      List_Price: nextList,
      Cost: nextCost,
      Is_Active: nextActive,
      Updated_At: nowIso(),
    },
  };
}

export function activeProductLabel(active: boolean): string {
  return active ? "啟用" : "停用";
}

/** 將舊 Unit_Price／Status 形狀遷移為 List_Price／Is_Active */
export function migrateProductShape(raw: unknown): Product | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.Product_ID !== "string" || typeof o.Product_Name !== "string") {
    return null;
  }
  const list =
    typeof o.List_Price === "number"
      ? o.List_Price
      : typeof o.Unit_Price === "number"
        ? o.Unit_Price
        : null;
  if (list === null || !Number.isFinite(list)) return null;
  let active = true;
  if (typeof o.Is_Active === "boolean") active = o.Is_Active;
  else if (o.Status === "下架") active = false;
  else if (o.Status === "上架") active = true;
  const onHand =
    typeof o.On_Hand === "number" && Number.isFinite(o.On_Hand)
      ? Math.max(0, Math.round(o.On_Hand))
      : 50;
  return {
    Product_ID: o.Product_ID,
    Product_Name: o.Product_Name,
    Category: typeof o.Category === "string" ? o.Category : "咖啡豆",
    Unit: typeof o.Unit === "string" ? o.Unit : "包",
    List_Price: Math.round(list),
    Cost:
      typeof o.Cost === "number" && Number.isFinite(o.Cost)
        ? Math.round(o.Cost)
        : Math.round(list * 0.5),
    On_Hand: onHand,
    Is_Active: active,
    Description: typeof o.Description === "string" ? o.Description : "",
    Created_At: typeof o.Created_At === "string" ? o.Created_At : undefined,
    Updated_At: typeof o.Updated_At === "string" ? o.Updated_At : undefined,
  };
}
