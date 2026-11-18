export type NavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** 左側／群組導覽：營運優先，驗收獨立 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "總覽",
    items: [{ href: "/", label: "主頁" }],
  },
  {
    id: "sales",
    label: "銷售",
    items: [
      { href: "/quotations", label: "報價" },
      { href: "/orders", label: "訂單" },
      { href: "/quote-to-order", label: "報價轉訂單" },
    ],
  },
  {
    id: "master",
    label: "主檔",
    items: [
      { href: "/customers", label: "客戶" },
      { href: "/products", label: "商品" },
    ],
  },
  {
    id: "ops",
    label: "履約",
    items: [
      { href: "/inventory", label: "庫存" },
      { href: "/shipping", label: "出貨" },
      { href: "/receivables", label: "應收" },
    ],
  },
  {
    id: "system",
    label: "系統",
    items: [
      { href: "/settings", label: "設定", adminOnly: true },
      { href: "/acceptance", label: "驗收區" },
    ],
  },
];

export const BREADCRUMB_LABELS: Record<string, string> = {
  "": "主頁",
  customers: "客戶",
  products: "商品",
  quotations: "報價",
  orders: "訂單",
  "quote-to-order": "報價轉訂單",
  inventory: "庫存",
  shipping: "出貨",
  receivables: "應收",
  settings: "設定",
  acceptance: "驗收區",
  new: "新增",
  edit: "編輯",
};

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
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
