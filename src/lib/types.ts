export type Role = "Admin" | "Staff";

export type OrderStatus = "待確認" | "處理中" | "已出貨" | "已取消";

export interface Customer {
  Customer_ID: string;
  Customer_Name: string;
  Contact: string;
  Region: string;
  Status: "啟用" | "停用";
}

export interface Product {
  Product_ID: string;
  Product_Name: string;
  Category: string;
  Unit_Price: number;
  Unit: string;
  Status: "上架" | "下架";
}

export interface SalesOrder {
  Order_ID: string;
  Order_Date: string;
  Customer_ID: string;
  Order_Status: OrderStatus;
  Total_Amount: number;
}

export interface SalesOrderDetail {
  Detail_ID: string;
  Order_ID: string;
  Product_ID: string;
  Qty: number;
  Unit_Price: number;
  Discount: number;
  Subtotal: number;
}

export interface AppUser {
  User_ID: string;
  User_Name: string;
  Role: Role;
  Is_Active: boolean;
}
