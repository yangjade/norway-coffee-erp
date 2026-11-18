export const DEFAULT_PAGE_SIZE = 10;

export function paginate<T>(
  rows: T[],
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
): { pageRows: T[]; page: number; pageCount: number; total: number } {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
  };
}

export function compareText(a: string, b: string, dir: "asc" | "desc" = "asc") {
  const c = a.localeCompare(b, "zh-Hant");
  return dir === "asc" ? c : -c;
}

export function compareNum(a: number, b: number, dir: "asc" | "desc" = "asc") {
  return dir === "asc" ? a - b : b - a;
}
