import { BASE_DATE } from "./sample-data";
import type { Customer, SalesOrder } from "./types";

export interface DashboardKpi {
  customerCount: number;
  todayValidOrderCount: number;
  todayValidOrderAmount: number;
  pendingShipmentCount: number;
}

/** 四項 KPI 一律由樣本資料計算（基準日 2026-10-13） */
export function computeKpi(
  customerList: Customer[],
  orderList: SalesOrder[],
  baseDate: string = BASE_DATE,
): DashboardKpi {
  const customerCount = new Set(customerList.map((c) => c.Customer_ID)).size;

  const todayValid = orderList.filter(
    (o) => o.Order_Date === baseDate && o.Order_Status !== "已取消",
  );

  const pendingShipment = orderList.filter(
    (o) => o.Order_Status === "待確認" || o.Order_Status === "處理中",
  );

  return {
    customerCount,
    todayValidOrderCount: todayValid.length,
    todayValidOrderAmount: todayValid.reduce((sum, o) => sum + o.Total_Amount, 0),
    pendingShipmentCount: pendingShipment.length,
  };
}
