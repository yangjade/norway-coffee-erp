export function formatTwd(amount: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "decimal",
    maximumFractionDigits: 0,
  }).format(amount);
}
