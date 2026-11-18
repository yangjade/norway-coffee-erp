/**
 * 第 6 週：客戶「刪除」＝軟刪除（Is_Active=false），禁止實體刪除。
 */

export function softDeleteConfirmMessage(
  customerId: string,
  customerName: string,
): string {
  return [
    `確定要刪除／停用客戶 ${customerId}「${customerName}」？`,
    "",
    "說明（本系統不提供實體刪除）：",
    "• 不會從主檔移除資料列",
    "• 歷史訂單（Sales_Order）完整保留、關聯不變",
    "• Customer_ID 不變",
    "• 僅將 Is_Active 設為停用；之後可由系統管理者重新啟用",
  ].join("\n");
}

export function reactivateConfirmMessage(
  customerId: string,
  customerName: string,
): string {
  return `確定要重新啟用客戶 ${customerId}「${customerName}」？\n編號不變，歷史訂單仍可查。`;
}
