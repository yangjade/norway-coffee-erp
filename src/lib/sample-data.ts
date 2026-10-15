import type {
  AppUser,
  Customer,
  Product,
  SalesOrder,
  SalesOrderDetail,
} from "./types";

/** 統計基準日（Asia/Taipei）— KPI 必須由此計算，不可寫死 */
export const BASE_DATE = "2026-10-13";

export const customers: Customer[] = [
  { Customer_ID: "C001", Customer_Name: "北歐生活館", Contact: "林經理", Region: "台北", Status: "啟用" },
  { Customer_ID: "C002", Customer_Name: "峽灣咖啡廳", Contact: "陳店長", Region: "新北", Status: "啟用" },
  { Customer_ID: "C003", Customer_Name: "松林選物店", Contact: "黃小姐", Region: "台中", Status: "啟用" },
  { Customer_ID: "C004", Customer_Name: "極光餐飲集團", Contact: "吳採購", Region: "高雄", Status: "啟用" },
  { Customer_ID: "C005", Customer_Name: "森林辦公咖啡", Contact: "張主任", Region: "桃園", Status: "啟用" },
];

export const products: Product[] = [
  { Product_ID: "P001", Product_Name: "挪威淺焙精品豆", Category: "咖啡豆", Unit_Price: 1800, Unit: "包", Status: "上架" },
  { Product_ID: "P002", Product_Name: "日曬耶加雪菲", Category: "咖啡豆", Unit_Price: 600, Unit: "包", Status: "上架" },
  { Product_ID: "P003", Product_Name: "冷萃濃縮液", Category: "飲品原料", Unit_Price: 800, Unit: "瓶", Status: "上架" },
];

/** 可變動的訂單狀態（供教學測試 T05）；金額仍由明細推導核對 */
export const initialOrders: SalesOrder[] = [
  { Order_ID: "SO001", Order_Date: "2026-10-13", Customer_ID: "C001", Order_Status: "處理中", Total_Amount: 4200 },
  { Order_ID: "SO002", Order_Date: "2026-10-13", Customer_ID: "C002", Order_Status: "待確認", Total_Amount: 1800 },
  { Order_ID: "SO003", Order_Date: "2026-10-13", Customer_ID: "C003", Order_Status: "已出貨", Total_Amount: 3000 },
  { Order_ID: "SO004", Order_Date: "2026-10-13", Customer_ID: "C004", Order_Status: "已取消", Total_Amount: 2400 },
  { Order_ID: "SO005", Order_Date: "2026-10-12", Customer_ID: "C005", Order_Status: "處理中", Total_Amount: 1600 },
];

export const orderDetails: SalesOrderDetail[] = [
  { Detail_ID: "D001", Order_ID: "SO001", Product_ID: "P001", Qty: 2, Unit_Price: 1800, Discount: 1, Subtotal: 3600 },
  { Detail_ID: "D002", Order_ID: "SO001", Product_ID: "P002", Qty: 1, Unit_Price: 600, Discount: 1, Subtotal: 600 },
  { Detail_ID: "D003", Order_ID: "SO002", Product_ID: "P001", Qty: 1, Unit_Price: 1800, Discount: 1, Subtotal: 1800 },
  { Detail_ID: "D004", Order_ID: "SO003", Product_ID: "P001", Qty: 1, Unit_Price: 1800, Discount: 1, Subtotal: 1800 },
  { Detail_ID: "D005", Order_ID: "SO003", Product_ID: "P002", Qty: 2, Unit_Price: 600, Discount: 1, Subtotal: 1200 },
  { Detail_ID: "D006", Order_ID: "SO004", Product_ID: "P003", Qty: 3, Unit_Price: 800, Discount: 1, Subtotal: 2400 },
  { Detail_ID: "D007", Order_ID: "SO005", Product_ID: "P003", Qty: 2, Unit_Price: 800, Discount: 1, Subtotal: 1600 },
];

export const initialUsers: AppUser[] = [
  { User_ID: "U001", User_Name: "管理者甲", Role: "Admin", Is_Active: true },
  { User_ID: "U002", User_Name: "業務乙", Role: "Staff", Is_Active: true },
];

export function customerName(id: string): string {
  return customers.find((c) => c.Customer_ID === id)?.Customer_Name ?? id;
}

export function productName(id: string): string {
  return products.find((p) => p.Product_ID === id)?.Product_Name ?? id;
}
