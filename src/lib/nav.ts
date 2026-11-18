export type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
  hint?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** 課堂原型側欄（對齊截圖 IA，文案更直覺） */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "master",
    label: "主檔",
    items: [
      { href: "/products", label: "產品主檔" },
      { href: "/products/pricing", label: "價格設定" },
      { href: "/customers", label: "客戶主檔" },
    ],
  },
  {
    id: "sales",
    label: "銷售",
    items: [
      { href: "/quotations", label: "報價單" },
      { href: "/orders", label: "銷售訂單 (W08)" },
      { href: "/orders/history", label: "歷史訂單 (W06)" },
      { href: "/quote-to-order", label: "報價轉訂單" },
    ],
  },
  {
    id: "inventory",
    label: "庫存 (W10)",
    items: [
      { href: "/inventory", label: "庫存查詢與設定" },
      { href: "/inventory/documents", label: "庫存單據（入出庫／盤點）" },
      { href: "/inventory/moves", label: "庫存異動紀錄" },
      { href: "/inventory/reservations", label: "訂單保留紀錄" },
    ],
  },
  {
    id: "ops",
    label: "履約",
    items: [
      { href: "/shipping", label: "出貨配送（第11週）" },
      { href: "/receivables", label: "應收（第12週）" },
    ],
  },
  {
    id: "acceptance",
    label: "課堂驗收",
    items: [
      { href: "/acceptance", label: "驗收總覽" },
      { href: "/acceptance#t01", label: "T01–T12 驗收" },
      { href: "/acceptance#s01", label: "S01–S13 訂單驗收" },
      { href: "/acceptance#i01", label: "I01–I17 庫存驗收" },
    ],
  },
  {
    id: "system",
    label: "系統",
    items: [
      { href: "/", label: "主頁總覽" },
      { href: "/settings", label: "設定", adminOnly: true },
    ],
  },
];

export const APP_VERSION = "v1.3 (W10)";
export const APP_VERSION_NOTE = "高於截圖：四分頁庫存＋I 一鍵全過";

export const BREADCRUMB_LABELS: Record<string, string> = {
  "": "主頁",
  customers: "客戶主檔",
  products: "產品主檔",
  pricing: "價格設定",
  quotations: "報價單",
  orders: "銷售訂單",
  history: "歷史訂單",
  "quote-to-order": "報價轉訂單",
  inventory: "庫存查詢與設定",
  documents: "庫存單據",
  moves: "異動紀錄",
  reservations: "訂單保留",
  shipping: "出貨配送",
  receivables: "應收",
  settings: "設定",
  acceptance: "驗收總覽",
  new: "新增",
  edit: "編輯",
};

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  const base = href.split("#")[0];
  if (base === "/orders") {
    return (
      (pathname === "/orders" || pathname === "/orders/") &&
      !pathname.includes("/history")
    );
  }
  if (base === "/inventory") {
    return (
      pathname === "/inventory" ||
      pathname === "/inventory/" ||
      pathname.startsWith("/inventory?")
    ) && !pathname.includes("/documents") &&
      !pathname.includes("/moves") &&
      !pathname.includes("/reservations");
  }
  if (base === "/acceptance") {
    return pathname === "/acceptance" || pathname.startsWith("/acceptance/");
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function buildBreadcrumbs(
  pathname: string,
): { href: string; label: string }[] {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/") {
    return [{ href: "/", label: "主頁" }];
  }
  const parts = clean.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "主頁" },
  ];
  let acc = "";
  for (const part of parts) {
    acc += `/${part}`;
    const known = BREADCRUMB_LABELS[part];
    crumbs.push({
      href: `${acc}/`,
      label: known ?? part,
    });
  }
  return crumbs;
}
