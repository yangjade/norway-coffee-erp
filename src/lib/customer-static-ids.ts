/** 靜態匯出預先產生的客戶路徑（涵蓋種子 + 課堂新增練習） */
export function customerStaticIds(max = 99): string[] {
  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return `C${String(n).padStart(3, "0")}`;
  });
}
