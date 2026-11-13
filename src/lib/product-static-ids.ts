/** 靜態匯出預先產生的商品路徑（Pages 可直連） */
export function productStaticIds(max = 99): string[] {
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return `P${String(n).padStart(3, "0")}`;
  });
}

/** 靜態匯出預先產生的報價路徑 Q001–Q099（Pages 列表→詳情可直連） */
export function quoteStaticIds(max = 99): string[] {
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return `Q${String(n).padStart(3, "0")}`;
  });
}
