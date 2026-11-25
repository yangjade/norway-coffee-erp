/**
 * 第 11 週出貨示範種子：重設樣本後仍在。
 * - SO-W11-RDY：Confirmed＋有效保留 → 可建草稿
 * - SO-W11-SOB：Confirmed＋保留＋Draft（SH-20261125-001）→ Admin 可過帳
 * - 另三張 Posted 示範物流：InTransit／Delivered／Exception（與過帳分開）
 */
import type {
  DeliveryStatusLog,
  Product,
  SalesOrder,
  SalesOrderDetail,
  Shipment,
  ShipmentDetail,
  StockReservation,
} from "./types";
import { WAREHOUSE_ID } from "./types";

export const W11_ORDER_READY = "SO-W11-RDY";
export const W11_ORDER_SOB = "SO-W11-SOB";
export const W11_ORDER_IT = "SO-W11-IT";
export const W11_ORDER_DV = "SO-W11-DV";
export const W11_ORDER_EX = "SO-W11-EX";
export const W11_DRAFT_SHIPMENT = "SH-20261125-001";

const CREATED = "2026-11-25T02:00:00.000Z";

export type Week11SeedSlice = {
  orders: SalesOrder[];
  orderDetails: SalesOrderDetail[];
  stockReservations: StockReservation[];
  shipments: Shipment[];
  shipmentDetails: ShipmentDetail[];
  deliveryLogs: DeliveryStatusLog[];
};

export function week11ShippingDemoSlice(): Week11SeedSlice {
  const orders: SalesOrder[] = [
    {
      Order_ID: W11_ORDER_READY,
      Order_Date: "2026-11-18",
      Customer_ID: "C001",
      Order_Status: "Confirmed",
      Requested_Date: "2026-11-23",
      Promised_Date: "2026-11-23",
      Delivery_Agreed: true,
      Delivery_Date: "2026-11-23",
      Ship_To_Name: "教學收貨人",
      Ship_To_Address: "台南市教學路 100 號",
      Payment_Terms_Snapshot: "匯款後出貨",
      Subtotal: 1500,
      Tax_Rate: 0.05,
      Tax_Amount: 0,
      Total_Amount: 1500,
      Notes: "示範：可建出貨草稿（Confirmed＋保留）",
    },
    {
      Order_ID: W11_ORDER_SOB,
      Order_Date: "2026-11-18",
      Customer_ID: "C001",
      Order_Status: "Confirmed",
      Requested_Date: "2026-11-23",
      Promised_Date: "2026-11-23",
      Delivery_Agreed: true,
      Delivery_Date: "2026-11-23",
      Ship_To_Name: "教學收貨人",
      Ship_To_Address: "台南市教學路 100 號",
      Payment_Terms_Snapshot: "匯款後出貨",
      Subtotal: 9300,
      Tax_Rate: 0.05,
      Tax_Amount: 0,
      Total_Amount: 9300,
      Notes: "SO-B 教學別名：草稿可過帳（P002×15＋P011×1）",
    },
    {
      Order_ID: W11_ORDER_IT,
      Order_Date: "2026-11-10",
      Customer_ID: "C002",
      Order_Status: "Confirmed",
      Requested_Date: "2026-11-12",
      Promised_Date: "2026-11-12",
      Delivery_Agreed: true,
      Delivery_Date: "2026-11-12",
      Ship_To_Name: "峽灣門市",
      Ship_To_Address: "台北市示範路 2 號",
      Payment_Terms_Snapshot: "月結30天",
      Subtotal: 600,
      Tax_Rate: 0.05,
      Tax_Amount: 0,
      Total_Amount: 600,
      Notes: "物流示範 InTransit（運送中）",
    },
    {
      Order_ID: W11_ORDER_DV,
      Order_Date: "2026-11-08",
      Customer_ID: "C003",
      Order_Status: "Confirmed",
      Requested_Date: "2026-11-10",
      Promised_Date: "2026-11-10",
      Delivery_Agreed: true,
      Delivery_Date: "2026-11-10",
      Ship_To_Name: "松林收貨",
      Ship_To_Address: "新北市示範路 3 號",
      Payment_Terms_Snapshot: "匯款後出貨",
      Subtotal: 300,
      Tax_Rate: 0.05,
      Tax_Amount: 0,
      Total_Amount: 300,
      Notes: "物流示範 Delivered（已送達）",
    },
    {
      Order_ID: W11_ORDER_EX,
      Order_Date: "2026-11-05",
      Customer_ID: "C004",
      Order_Status: "Confirmed",
      Requested_Date: "2026-11-07",
      Promised_Date: "2026-11-07",
      Delivery_Agreed: true,
      Delivery_Date: "2026-11-07",
      Ship_To_Name: "極光選豆",
      Ship_To_Address: "台中市示範路 4 號",
      Payment_Terms_Snapshot: "現結",
      Subtotal: 600,
      Tax_Rate: 0.05,
      Tax_Amount: 0,
      Total_Amount: 600,
      Notes: "物流示範 Exception",
    },
  ];

  const orderDetails: SalesOrderDetail[] = [
    {
      Detail_ID: "DW11-RDY-1",
      Order_ID: W11_ORDER_READY,
      Product_ID: "P003",
      Product_Name_Snapshot: "冷萃濃縮液",
      Unit_Snapshot: "瓶",
      Qty: 2,
      Unit_Price: 800,
      Discount_Rate: 0,
      Line_Amount: 1600,
      Shipped_Qty: 0,
    },
    {
      Detail_ID: "DW11-SOB-1",
      Order_ID: W11_ORDER_SOB,
      Product_ID: "P002",
      Product_Name_Snapshot: "日曬耶加雪菲",
      Unit_Snapshot: "包",
      Qty: 15,
      Unit_Price: 600,
      Discount_Rate: 0,
      Line_Amount: 9000,
      Shipped_Qty: 0,
    },
    {
      Detail_ID: "DW11-SOB-2",
      Order_ID: W11_ORDER_SOB,
      Product_ID: "P011",
      Product_Name_Snapshot: "峽灣小罐精品粉",
      Unit_Snapshot: "罐",
      Qty: 1,
      Unit_Price: 300,
      Discount_Rate: 0,
      Line_Amount: 300,
      Shipped_Qty: 0,
    },
    {
      Detail_ID: "DW11-IT-1",
      Order_ID: W11_ORDER_IT,
      Product_ID: "P004",
      Product_Name_Snapshot: "藍山風味 濾掛式咖啡",
      Unit_Snapshot: "盒",
      Qty: 1,
      Unit_Price: 380,
      Discount_Rate: 0,
      Line_Amount: 380,
      Shipped_Qty: 1,
    },
    {
      Detail_ID: "DW11-DV-1",
      Order_ID: W11_ORDER_DV,
      Product_ID: "P005",
      Product_Name_Snapshot: "美式咖啡",
      Unit_Snapshot: "杯",
      Qty: 2,
      Unit_Price: 90,
      Discount_Rate: 0,
      Line_Amount: 180,
      Shipped_Qty: 2,
    },
    {
      Detail_ID: "DW11-EX-1",
      Order_ID: W11_ORDER_EX,
      Product_ID: "P004",
      Product_Name_Snapshot: "藍山風味 濾掛式咖啡",
      Unit_Snapshot: "盒",
      Qty: 1,
      Unit_Price: 380,
      Discount_Rate: 0,
      Line_Amount: 380,
      Shipped_Qty: 1,
    },
  ];

  const stockReservations: StockReservation[] = [
    {
      Reserve_ID: "RV-W11-RDY-1",
      Order_ID: W11_ORDER_READY,
      Detail_ID: "DW11-RDY-1",
      Product_ID: "P003",
      Warehouse_ID: WAREHOUSE_ID,
      Qty: 2,
      Is_Active: true,
      Created_At: CREATED,
    },
    {
      Reserve_ID: "RV-W11-SOB-1",
      Order_ID: W11_ORDER_SOB,
      Detail_ID: "DW11-SOB-1",
      Product_ID: "P002",
      Warehouse_ID: WAREHOUSE_ID,
      Qty: 15,
      Is_Active: true,
      Created_At: CREATED,
    },
    {
      Reserve_ID: "RV-W11-SOB-2",
      Order_ID: W11_ORDER_SOB,
      Detail_ID: "DW11-SOB-2",
      Product_ID: "P011",
      Warehouse_ID: WAREHOUSE_ID,
      Qty: 1,
      Is_Active: true,
      Created_At: CREATED,
    },
    // 已出貨示範：保留已消耗
    {
      Reserve_ID: "RV-W11-IT-1",
      Order_ID: W11_ORDER_IT,
      Detail_ID: "DW11-IT-1",
      Product_ID: "P004",
      Warehouse_ID: WAREHOUSE_ID,
      Qty: 1,
      Is_Active: false,
      Created_At: "2026-11-12T01:00:00.000Z",
      Consume_Reason: "shipment",
      Consumed_By_Shipment_ID: "SH-20261112-001",
      Consumed_At: "2026-11-12T03:00:00.000Z",
    },
    {
      Reserve_ID: "RV-W11-DV-1",
      Order_ID: W11_ORDER_DV,
      Detail_ID: "DW11-DV-1",
      Product_ID: "P005",
      Warehouse_ID: WAREHOUSE_ID,
      Qty: 2,
      Is_Active: false,
      Created_At: "2026-11-10T01:00:00.000Z",
      Consume_Reason: "shipment",
      Consumed_By_Shipment_ID: "SH-20261110-001",
      Consumed_At: "2026-11-10T03:00:00.000Z",
    },
    {
      Reserve_ID: "RV-W11-EX-1",
      Order_ID: W11_ORDER_EX,
      Detail_ID: "DW11-EX-1",
      Product_ID: "P004",
      Warehouse_ID: WAREHOUSE_ID,
      Qty: 1,
      Is_Active: false,
      Created_At: "2026-11-07T01:00:00.000Z",
      Consume_Reason: "shipment",
      Consumed_By_Shipment_ID: "SH-20261107-001",
      Consumed_At: "2026-11-07T03:00:00.000Z",
    },
  ];

  const shipments: Shipment[] = [
    {
      Shipment_ID: W11_DRAFT_SHIPMENT,
      Order_ID: W11_ORDER_SOB,
      Warehouse_ID: WAREHOUSE_ID,
      Shipment_Date: "2026-11-25",
      Recipient: "教學收貨人",
      Address_Snapshot: "台南市教學路 100 號",
      Delivery_Method: "宅配",
      Carrier: "教學物流",
      Tracking_No: "DEMO-0001",
      Shipment_Status: "Draft",
      Delivery_Status: "Pending",
      Notes: "SO-B 草稿：過帳前 Pending；過帳後變 InTransit",
      Created_At: CREATED,
      Created_By: "U002",
    },
    {
      Shipment_ID: "SH-20261112-001",
      Order_ID: W11_ORDER_IT,
      Warehouse_ID: WAREHOUSE_ID,
      Shipment_Date: "2026-11-12",
      Recipient: "峽灣門市",
      Address_Snapshot: "台北市示範路 2 號",
      Delivery_Method: "宅配",
      Carrier: "教學物流",
      Tracking_No: "DEMO-IT-01",
      Shipment_Status: "Posted",
      Delivery_Status: "InTransit",
      Posted_At: "2026-11-12T03:00:00.000Z",
      Posted_By: "U001",
      Created_At: "2026-11-12T02:00:00.000Z",
      Created_By: "U002",
    },
    {
      Shipment_ID: "SH-20261110-001",
      Order_ID: W11_ORDER_DV,
      Warehouse_ID: WAREHOUSE_ID,
      Shipment_Date: "2026-11-10",
      Recipient: "松林收貨",
      Address_Snapshot: "新北市示範路 3 號",
      Delivery_Method: "宅配",
      Carrier: "教學物流",
      Tracking_No: "DEMO-DV-01",
      Shipment_Status: "Posted",
      Delivery_Status: "Delivered",
      Posted_At: "2026-11-10T03:00:00.000Z",
      Posted_By: "U001",
      Delivered_At: "2026-11-11T08:00:00.000Z",
      Receipt_Note: "客戶簽收",
      Created_At: "2026-11-10T02:00:00.000Z",
      Created_By: "U002",
    },
    {
      Shipment_ID: "SH-20261107-001",
      Order_ID: W11_ORDER_EX,
      Warehouse_ID: WAREHOUSE_ID,
      Shipment_Date: "2026-11-07",
      Recipient: "極光選豆",
      Address_Snapshot: "台中市示範路 4 號",
      Delivery_Method: "宅配",
      Carrier: "教學物流",
      Tracking_No: "DEMO-EX-01",
      Shipment_Status: "Posted",
      Delivery_Status: "Exception",
      Posted_At: "2026-11-07T03:00:00.000Z",
      Posted_By: "U001",
      Exception_Note: "地址無人收件",
      Exception_At: "2026-11-08T04:00:00.000Z",
      Exception_By: "U002",
      Created_At: "2026-11-07T02:00:00.000Z",
      Created_By: "U002",
    },
  ];

  const shipmentDetails: ShipmentDetail[] = [
    {
      Shipment_ID: W11_DRAFT_SHIPMENT,
      Line_No: 1,
      Order_Line: "DW11-SOB-1",
      Product_ID: "P002",
      Reservation_ID: "RV-W11-SOB-1",
      Product_Name_Snapshot: "日曬耶加雪菲",
      Unit_Snapshot: "包",
      Ship_Qty: 15,
    },
    {
      Shipment_ID: W11_DRAFT_SHIPMENT,
      Line_No: 2,
      Order_Line: "DW11-SOB-2",
      Product_ID: "P011",
      Reservation_ID: "RV-W11-SOB-2",
      Product_Name_Snapshot: "峽灣小罐精品粉",
      Unit_Snapshot: "罐",
      Ship_Qty: 1,
    },
    {
      Shipment_ID: "SH-20261112-001",
      Line_No: 1,
      Order_Line: "DW11-IT-1",
      Product_ID: "P004",
      Reservation_ID: "RV-W11-IT-1",
      Product_Name_Snapshot: "藍山風味 濾掛式咖啡",
      Unit_Snapshot: "盒",
      Ship_Qty: 1,
    },
    {
      Shipment_ID: "SH-20261110-001",
      Line_No: 1,
      Order_Line: "DW11-DV-1",
      Product_ID: "P005",
      Reservation_ID: "RV-W11-DV-1",
      Product_Name_Snapshot: "美式咖啡",
      Unit_Snapshot: "杯",
      Ship_Qty: 2,
    },
    {
      Shipment_ID: "SH-20261107-001",
      Line_No: 1,
      Order_Line: "DW11-EX-1",
      Product_ID: "P004",
      Reservation_ID: "RV-W11-EX-1",
      Product_Name_Snapshot: "藍山風味 濾掛式咖啡",
      Unit_Snapshot: "盒",
      Ship_Qty: 1,
    },
  ];

  const deliveryLogs: DeliveryStatusLog[] = [
    {
      Log_ID: "DL-W11-001",
      Shipment_ID: W11_DRAFT_SHIPMENT,
      From_Status: "Pending",
      To_Status: "Pending",
      Reason: "建立草稿（Pending）",
      At: CREATED,
      By_User_ID: "U002",
      By_User_Name: "業務乙",
    },
    {
      Log_ID: "DL-W11-002",
      Shipment_ID: "SH-20261112-001",
      From_Status: "Pending",
      To_Status: "InTransit",
      Reason: "過帳後交付承運（運送中）",
      Tracking_No_After: "DEMO-IT-01",
      At: "2026-11-12T03:00:00.000Z",
      By_User_ID: "U001",
      By_User_Name: "管理者甲",
    },
    {
      Log_ID: "DL-W11-003",
      Shipment_ID: "SH-20261110-001",
      From_Status: "Pending",
      To_Status: "InTransit",
      Reason: "過帳後交付承運",
      At: "2026-11-10T03:00:00.000Z",
      By_User_ID: "U001",
      By_User_Name: "管理者甲",
    },
    {
      Log_ID: "DL-W11-004",
      Shipment_ID: "SH-20261110-001",
      From_Status: "InTransit",
      To_Status: "Delivered",
      Reason: "客戶簽收（已送達）",
      At: "2026-11-11T08:00:00.000Z",
      By_User_ID: "U002",
      By_User_Name: "業務乙",
    },
    {
      Log_ID: "DL-W11-005",
      Shipment_ID: "SH-20261107-001",
      From_Status: "Pending",
      To_Status: "InTransit",
      Reason: "過帳後交付承運",
      At: "2026-11-07T03:00:00.000Z",
      By_User_ID: "U001",
      By_User_Name: "管理者甲",
    },
    {
      Log_ID: "DL-W11-006",
      Shipment_ID: "SH-20261107-001",
      From_Status: "InTransit",
      To_Status: "Exception",
      Reason: "地址無人收件",
      At: "2026-11-08T04:00:00.000Z",
      By_User_ID: "U002",
      By_User_Name: "業務乙",
    },
  ];

  return {
    orders,
    orderDetails,
    stockReservations,
    shipments,
    shipmentDetails,
    deliveryLogs,
  };
}

/** 套用示範：庫存對齊講義 P002 26／P011 8；缺則注入 */
export function applyWeek11ShippingDemo<T extends {
  orders: SalesOrder[];
  orderDetails: SalesOrderDetail[];
  products: Product[];
  stockReservations: StockReservation[];
  shipments: Shipment[];
  shipmentDetails: ShipmentDetail[];
  deliveryLogs: DeliveryStatusLog[];
}>(state: T): T {
  const demo = week11ShippingDemoSlice();
  const hasSob = state.orders.some((o) => o.Order_ID === W11_ORDER_SOB);
  if (hasSob) {
    // 仍校正庫存，避免舊種子過低無法過帳
    return {
      ...state,
      products: state.products.map((p) => {
        if (p.Product_ID === "P002") return { ...p, On_Hand: Math.max(p.On_Hand, 26) };
        if (p.Product_ID === "P011") return { ...p, On_Hand: Math.max(p.On_Hand, 8) };
        if (p.Product_ID === "P003") return { ...p, On_Hand: Math.max(p.On_Hand, 40) };
        return p;
      }),
    };
  }

  const orderIds = new Set(demo.orders.map((o) => o.Order_ID));
  return {
    ...state,
    orders: [
      ...state.orders.filter((o) => !orderIds.has(o.Order_ID)),
      ...demo.orders,
    ],
    orderDetails: [
      ...state.orderDetails.filter((d) => !orderIds.has(d.Order_ID)),
      ...demo.orderDetails,
    ],
    products: state.products.map((p) => {
      if (p.Product_ID === "P002") return { ...p, On_Hand: 26 };
      if (p.Product_ID === "P011") return { ...p, On_Hand: 8 };
      if (p.Product_ID === "P003") return { ...p, On_Hand: Math.max(p.On_Hand, 40) };
      return p;
    }),
    stockReservations: [
      ...state.stockReservations.filter((r) => !orderIds.has(r.Order_ID)),
      ...demo.stockReservations,
    ],
    shipments: [
      ...state.shipments.filter(
        (s) =>
          !demo.shipments.some((d) => d.Shipment_ID === s.Shipment_ID),
      ),
      ...demo.shipments,
    ],
    shipmentDetails: [
      ...state.shipmentDetails.filter(
        (d) =>
          !demo.shipmentDetails.some(
            (x) =>
              x.Shipment_ID === d.Shipment_ID && x.Line_No === d.Line_No,
          ),
      ),
      ...demo.shipmentDetails,
    ],
    deliveryLogs: [
      ...state.deliveryLogs.filter(
        (l) => !demo.deliveryLogs.some((d) => d.Log_ID === l.Log_ID),
      ),
      ...demo.deliveryLogs,
    ],
  };
}
