/** 靜態匯出預先產生的訂單路徑 SO001–SO099（Pages 可直連新轉單） */
export function orderStaticIds(max = 99): string[] {
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return `SO${String(n).padStart(3, "0")}`;
  });
}
