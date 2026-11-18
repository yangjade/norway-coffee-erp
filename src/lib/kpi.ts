import { BASE_DATE } from "./sample-data";
import type { Customer, SalesOrder } from "./types";

export interface DashboardKpi {
  customerCount: number;
  todayValidOrderCount: number;
  todayValidOrderAmount: number;
  pendingShipmentCount: number;
}

/** 首頁 KPI：已確認訂單數／金額；待出貨＝已確認且未扣庫 */
export function computeKpi(
  customerList: Customer[],
  orderList: SalesOrder[],
  baseDate: string = BASE_DATE,
): DashboardKpi {
  const customerCount = new Set(customerList.map((c) => c.Customer_ID)).size;

  const confirmed = orderList.filter((o) => o.Order_Status === "Confirmed");
  const todayValid = confirmed.filter((o) => o.Order_Date === baseDate);

  const pendingShipment = confirmed.filter((o) => !o.Stock_Deducted);

  return {
    customerCount,
    todayValidOrderCount: todayValid.length || confirmed.length,
    todayValidOrderAmount: (
      todayValid.length ? todayValid : confirmed
    ).reduce((sum, o) => sum + o.Total_Amount, 0),
    pendingShipmentCount: pendingShipment.length,
  };
}
