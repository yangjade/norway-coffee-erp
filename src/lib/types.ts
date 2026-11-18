export type Role = "Admin" | "Staff";

/** 第 8 週訂單狀態（講義）：Draft → Confirmed → Cancelled */
export type OrderStatus = "Draft" | "Confirmed" | "Cancelled";

/** 客戶分類（本週枚舉） */
export type CustomerType = "零售" | "批發" | "企業";

/** 付款條件（本週枚舉） */
export type PaymentTerms = "現結" | "月結30天";

/** 報價狀態（第 7 週） */
export type QuoteStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Expired";

/** 咖啡產業商品分類 */
export type ProductCategory =
  | "咖啡豆"
  | "濾掛"
  | "飲品"
  | "甜點"
  | "飲品原料"
  | "禮盒";

export interface Customer {
  Customer_ID: string;
  Customer_Name: string;
  Customer_Type: CustomerType;
  Phone: string;
  Email: string;
  Payment_Terms: PaymentTerms;
  Credit_Limit: number;
  Is_Active: boolean;
  Notes: string;
  /** 相容舊樣本／顯示用聯絡人（選填） */
  Contact?: string;
  Created_At?: string;
  Updated_At?: string;
}

/**
 * 產品主檔（第 7 週）
 * List_Price＝目前參考售價；Cost＝內部成本；
 * Quotation_Detail.Unit_Price＝報價當下快照（不可回寫）。
 */
export interface Product {
  Product_ID: string;
  Product_Name: string;
  Category: string;
  Unit: string;
  List_Price: number;
  Cost: number;
  /** 現有庫存（第 10 週教學：單一 on-hand，無多倉） */
  On_Hand: number;
  Is_Active: boolean;
  Description: string;
  Created_At?: string;
  Updated_At?: string;
}

export interface SalesOrder {
  Order_ID: string;
  Order_Date: string;
  Customer_ID: string;
  Order_Status: OrderStatus;
  /** 來源報價（第 8 週轉單） */
  Quote_ID?: string;
  /** 客戶期望交貨日 */
  Requested_Date: string;
  /** 公司承諾交貨日 */
  Promised_Date: string;
  /** 承諾晚於期望時之改期同意 */
  Delivery_Agreed: boolean;
  Delivery_Agree_Note?: string;
  Ship_To_Name?: string;
  Ship_To_Address?: string;
  Payment_Terms_Snapshot?: string;
  Notes?: string;
  Subtotal: number;
  Tax_Rate: number;
  Tax_Amount: number;
  Total_Amount: number;
  /**
   * 相容舊欄位：單一日交期（讀取時可映射到 Promised_Date）
   * @deprecated 請用 Requested_Date / Promised_Date
   */
  Delivery_Date?: string;
  /** 第 10／11 週：出貨才扣庫（確認訂單不扣） */
  Stock_Deducted?: boolean;
  Cancel_Reason?: string;
  Reopen_Reason?: string;
}

export interface SalesOrderDetail {
  Detail_ID: string;
  Order_ID: string;
  Product_ID: string;
  Product_Name_Snapshot: string;
  Unit_Snapshot: string;
  Qty: number;
  /** 成交單價快照（鎖定） */
  Unit_Price: number;
  /** 折扣率 0–100 */
  Discount_Rate: number;
  /** 折後未稅額（整數） */
  Line_Amount: number;
  /** @deprecated 舊乘數折扣；遷移用 */
  Discount?: number;
  Subtotal?: number;
}

export interface OrderAuditEntry {
  Audit_ID: string;
  Order_ID: string;
  At: string;
  User_ID: string;
  User_Name: string;
  Action: string;
  Reason?: string;
  Before?: string;
  After?: string;
}

export interface Quotation {
  Quote_ID: string;
  Customer_ID: string;
  Quote_Date: string;
  Valid_Until: string;
  Status: QuoteStatus;
  Discount_Amount: number;
  Tax_Rate: number;
  Subtotal: number;
  Tax_Amount: number;
  Total: number;
  Notes?: string;
  Created_At?: string;
  Updated_At?: string;
}

export interface QuotationDetail {
  Quote_ID: string;
  Line_No: number;
  Product_ID: string;
  Product_Name_Snapshot: string;
  Qty: number;
  /** 報價當時單價快照（≠ 主檔 List_Price） */
  Unit_Price: number;
  /** 折扣率 0–100（第 8 週轉單帶入） */
  Discount_Rate?: number;
  Line_Amount: number;
  Unit_Snapshot?: string;
}

export interface AppUser {
  User_ID: string;
  User_Name: string;
  Role: Role;
  Is_Active: boolean;
}

/** Staff 可寫入的客戶欄位 */
export type CustomerStaffWritable = Pick<
  Customer,
  "Customer_Name" | "Customer_Type" | "Phone" | "Email" | "Notes" | "Contact"
>;

/** Admin 可額外寫入的信控／啟用欄位（表單可傳字串額度，由規則層解析） */
export type CustomerAdminWritable = {
  Payment_Terms: PaymentTerms;
  Credit_Limit: number | string;
  Is_Active: boolean;
};

export type CustomerCreateInput = CustomerStaffWritable &
  Partial<CustomerAdminWritable>;

export type CustomerUpdateInput = Partial<
  CustomerStaffWritable & CustomerAdminWritable
>;

/** Staff 產品：可新增；修改僅名稱／說明 */
export type ProductStaffWritable = Pick<
  Product,
  "Product_Name" | "Description" | "Category" | "Unit"
>;

export type ProductAdminWritable = {
  List_Price: number | string;
  Cost: number | string;
  Is_Active: boolean;
};

export type ProductCreateInput = ProductStaffWritable &
  Partial<ProductAdminWritable>;

export type ProductUpdateInput = Partial<
  ProductStaffWritable & ProductAdminWritable
>;

export type QuotationDetailInput = {
  Product_ID: string;
  Qty: number;
  /** Admin 可覆寫；Staff 建立時強制用 List_Price */
  Unit_Price?: number;
  Discount_Rate?: number;
};

export type QuotationCreateInput = {
  Customer_ID: string;
  Quote_Date: string;
  Valid_Until: string;
  Discount_Amount?: number | string;
  Notes?: string;
  lines: QuotationDetailInput[];
};

export type QuotationUpdateInput = {
  Quote_Date?: string;
  Valid_Until?: string;
  Discount_Amount?: number | string;
  Notes?: string;
  lines?: QuotationDetailInput[];
};

/** 庫存異動（第 10 週教學級） */
export type StockMoveReason = "出貨扣庫" | "取消還原" | "手動調整";

export interface StockMove {
  Move_ID: string;
  Product_ID: string;
  /** 正數入庫／負數出庫 */
  Qty: number;
  Reason: StockMoveReason;
  Ref_Order_ID?: string;
  Move_Date: string;
  Note?: string;
}

/** 應收狀態（第 12 週；非營所稅） */
export type ReceivableStatus = "未收" | "部分收款" | "已結清" | "已作廢";

export interface Receivable {
  AR_ID: string;
  Order_ID: string;
  Customer_ID: string;
  Invoice_Date: string;
  Amount: number;
  Paid_Amount: number;
  Status: ReceivableStatus;
  Notes?: string;
}

export interface Payment {
  Payment_ID: string;
  AR_ID: string;
  Pay_Date: string;
  Amount: number;
  Note?: string;
}
