import type {
  Customer,
  CustomerType,
  OrderStatus,
  Payment,
  PaymentTerms,
  Product,
  Quotation,
  QuotationDetail,
  QuoteStatus,
  Receivable,
  ReceivableStatus,
  SalesOrder,
  SalesOrderDetail,
  StockMove,
} from "./types";

const EXTRA_CUSTOMER_NAMES = [
  "北海烘焙工作室",
  "霜降咖啡工作室",
  "藍湖選品店",
  "白夜旅館餐飲部",
  "針葉林超市",
  "暮光手作甜點",
  "月灣商務中心",
  "冰原書店咖啡",
  "雲杉義式餐廳",
  "石楠花精品旅店",
  "琥珀豆商行",
  "冷杉企業福委會",
  "薄霧早午餐",
  "極圈便利購",
  "銀樺共廚",
  "峽灣大學合作社",
  "苔蘚藝廊咖啡",
  "雪原寵物友善館",
  "餘暉外燴服務",
  "深海藍色辦公室",
  "白樺樹瑜伽館",
  "晨霧花店咖啡角",
  "熔岩巧克力工房",
  "長夜影城餐飲",
];

const EXTRA_PRODUCTS: Omit<Product, "Product_ID">[] = [
  {
    Product_Name: "水洗肯尼亞 AA",
    Category: "咖啡豆",
    Unit: "包",
    List_Price: 980,
    Cost: 480,
    On_Hand: 65,
    Is_Active: true,
    Description: "黑醋栗酸質",
  },
  {
    Product_Name: "曼特寧深焙",
    Category: "咖啡豆",
    Unit: "包",
    List_Price: 720,
    Cost: 360,
    On_Hand: 70,
    Is_Active: true,
    Description: "厚實草本",
  },
  {
    Product_Name: "耶加水洗濾掛",
    Category: "濾掛",
    Unit: "盒",
    List_Price: 360,
    Cost: 170,
    On_Hand: 140,
    Is_Active: true,
    Description: "濾掛 10 入",
  },
  {
    Product_Name: "桂花冷萃",
    Category: "飲品",
    Unit: "杯",
    List_Price: 160,
    Cost: 55,
    On_Hand: 90,
    Is_Active: true,
    Description: "季節冷萃",
  },
  {
    Product_Name: "肉桂捲",
    Category: "甜點",
    Unit: "份",
    List_Price: 95,
    Cost: 40,
    On_Hand: 60,
    Is_Active: true,
    Description: "北歐肉桂捲",
  },
  {
    Product_Name: "燕麥拿鐵",
    Category: "飲品",
    Unit: "杯",
    List_Price: 150,
    Cost: 55,
    On_Hand: 110,
    Is_Active: true,
    Description: "植物奶拿鐵",
  },
  {
    Product_Name: "禮盒三入濾掛",
    Category: "禮盒",
    Unit: "盒",
    List_Price: 680,
    Cost: 320,
    On_Hand: 45,
    Is_Active: true,
    Description: "三風味濾掛組",
  },
  {
    Product_Name: "濃縮咖啡液 1L",
    Category: "飲品原料",
    Unit: "瓶",
    List_Price: 520,
    Cost: 250,
    On_Hand: 55,
    Is_Active: true,
    Description: "餐飲用濃縮",
  },
  {
    Product_Name: "可可布朗尼",
    Category: "甜點",
    Unit: "份",
    List_Price: 110,
    Cost: 45,
    On_Hand: 40,
    Is_Active: true,
    Description: "苦甜布朗尼",
  },
  {
    Product_Name: "哥倫比亞蜜處理",
    Category: "咖啡豆",
    Unit: "包",
    List_Price: 860,
    Cost: 430,
    On_Hand: 48,
    Is_Active: true,
    Description: "蜜香甜感",
  },
  {
    Product_Name: "季節組合濾掛（舊）",
    Category: "濾掛",
    Unit: "盒",
    List_Price: 390,
    Cost: 180,
    On_Hand: 0,
    Is_Active: false,
    Description: "下架示範",
  },
  {
    Product_Name: "手沖分享壺體驗",
    Category: "飲品",
    Unit: "份",
    List_Price: 480,
    Cost: 160,
    On_Hand: 35,
    Is_Active: true,
    Description: "雙人分享體驗",
  },
];

const TYPES: CustomerType[] = ["零售", "批發", "企業"];
const TERMS: PaymentTerms[] = ["現結", "月結30天"];
const ORDER_STATUSES: OrderStatus[] = [
  "待確認",
  "處理中",
  "已出貨",
  "已取消",
];
const QUOTE_STATUSES: QuoteStatus[] = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Expired",
];

function pad(n: number, w = 3) {
  return String(n).padStart(w, "0");
}

function dateOffset(base: string, dayDelta: number): string {
  const d = new Date(`${base}T00:00:00+08:00`);
  d.setDate(d.getDate() + dayDelta);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1, 2);
  const day = pad(d.getDate(), 2);
  return `${y}-${m}-${day}`;
}

export function buildExtraCustomers(existing: Customer[]): Customer[] {
  const have = new Set(existing.map((c) => c.Customer_ID));
  const out: Customer[] = [];
  let n = 13;
  for (const name of EXTRA_CUSTOMER_NAMES) {
    while (have.has(`C${pad(n)}`)) n += 1;
    const id = `C${pad(n)}`;
    have.add(id);
    const type = TYPES[(n - 1) % TYPES.length];
    const terms: PaymentTerms =
      type === "零售" ? "現結" : TERMS[n % TERMS.length];
    out.push({
      Customer_ID: id,
      Customer_Name: name,
      Customer_Type: type,
      Phone: `02-27${pad(n, 2)}-${pad(1000 + n * 7, 4)}`,
      Email: `buyer${n}@norway-coffee-demo.tw`,
      Payment_Terms: terms,
      Credit_Limit: terms === "現結" ? 0 : 10000 + n * 1500,
      Is_Active: n % 17 !== 0,
      Notes: "示範擴充客戶（分頁用）",
      Contact: `聯絡人${n}`,
      Created_At: `2026-09-${pad(Math.min(28, (n % 27) + 1), 2)}T02:00:00.000Z`,
      Updated_At: `2026-09-${pad(Math.min(28, (n % 27) + 1), 2)}T02:00:00.000Z`,
    });
    n += 1;
  }
  return out;
}

export function buildExtraProducts(existing: Product[]): Product[] {
  const have = new Set(existing.map((p) => p.Product_ID));
  const out: Product[] = [];
  let n = 11;
  for (const row of EXTRA_PRODUCTS) {
    while (have.has(`P${pad(n)}`)) n += 1;
    const id = `P${pad(n)}`;
    have.add(id);
    out.push({ Product_ID: id, ...row });
    n += 1;
  }
  return out;
}

export function buildVolumeDocuments(input: {
  customers: Customer[];
  products: Product[];
  baseOrders: SalesOrder[];
  baseOrderDetails: SalesOrderDetail[];
  baseQuotes: Quotation[];
  baseQuoteDetails: QuotationDetail[];
  baseReceivables: Receivable[];
  basePayments: Payment[];
  baseMoves: StockMove[];
  baseDate: string;
}): {
  orders: SalesOrder[];
  orderDetails: SalesOrderDetail[];
  quotations: Quotation[];
  quotationDetails: QuotationDetail[];
  receivables: Receivable[];
  payments: Payment[];
  stockMoves: StockMove[];
} {
  const activeCustomers = input.customers.filter((c) => c.Is_Active);
  const activeProducts = input.products.filter((p) => p.Is_Active);
  const orders = [...input.baseOrders];
  const orderDetails = [...input.baseOrderDetails];
  const quotations = [...input.baseQuotes];
  const quotationDetails = [...input.baseQuoteDetails];
  const receivables = [...input.baseReceivables];
  const payments = [...input.basePayments];
  const stockMoves = [...input.baseMoves];

  let detailSeq = orderDetails.length + 1;
  let moveSeq = stockMoves.length + 1;
  let arSeq = receivables.length + 1;
  let paySeq = payments.length + 1;

  for (let i = 6; i <= 45; i += 1) {
    const id = `SO${pad(i)}`;
    if (orders.some((o) => o.Order_ID === id)) continue;
    const cust = activeCustomers[(i - 1) % activeCustomers.length];
    const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
    const p1 = activeProducts[i % activeProducts.length];
    const p2 = activeProducts[(i + 3) % activeProducts.length];
    const qty1 = 1 + (i % 4);
    const qty2 = 1 + (i % 3);
    const sub1 = p1.List_Price * qty1;
    const sub2 = p2.List_Price * qty2;
    const total = sub1 + sub2;
    const shipped = status === "已出貨";
    const orderDate = dateOffset(input.baseDate, -(i % 14));

    orders.push({
      Order_ID: id,
      Order_Date: orderDate,
      Customer_ID: cust.Customer_ID,
      Order_Status: status,
      Total_Amount: total,
      Stock_Deducted: shipped,
    });

    orderDetails.push(
      {
        Detail_ID: `D${pad(detailSeq++)}`,
        Order_ID: id,
        Product_ID: p1.Product_ID,
        Qty: qty1,
        Unit_Price: p1.List_Price,
        Discount: 1,
        Subtotal: sub1,
      },
      {
        Detail_ID: `D${pad(detailSeq++)}`,
        Order_ID: id,
        Product_ID: p2.Product_ID,
        Qty: qty2,
        Unit_Price: p2.List_Price,
        Discount: 1,
        Subtotal: sub2,
      },
    );

    if (shipped) {
      stockMoves.push(
        {
          Move_ID: `M${pad(moveSeq++)}`,
          Product_ID: p1.Product_ID,
          Qty: -qty1,
          Reason: "出貨扣庫",
          Ref_Order_ID: id,
          Move_Date: orderDate,
          Note: `訂單 ${id} 出貨`,
        },
        {
          Move_ID: `M${pad(moveSeq++)}`,
          Product_ID: p2.Product_ID,
          Qty: -qty2,
          Reason: "出貨扣庫",
          Ref_Order_ID: id,
          Move_Date: orderDate,
          Note: `訂單 ${id} 出貨`,
        },
      );

      const arId = `AR${pad(arSeq++)}`;
      let paid = 0;
      let arStatus: ReceivableStatus = "未收";
      if (i % 7 === 0) {
        paid = total;
        arStatus = "已結清";
      } else if (i % 5 === 0) {
        paid = Math.round(total * 0.4);
        arStatus = "部分收款";
      }

      // overdue-ish: older invoice dates for unpaid
      const invoiceDate =
        paid === 0 ? dateOffset(input.baseDate, -(20 + (i % 10))) : orderDate;

      receivables.push({
        AR_ID: arId,
        Order_ID: id,
        Customer_ID: cust.Customer_ID,
        Invoice_Date: invoiceDate,
        Amount: total,
        Paid_Amount: paid,
        Status: arStatus,
        Notes: `由訂單 ${id} 出貨產生`,
      });

      if (paid > 0) {
        payments.push({
          Payment_ID: `PAY${pad(paySeq++)}`,
          AR_ID: arId,
          Pay_Date: dateOffset(invoiceDate, 3),
          Amount: paid,
          Note: "示範收款",
        });
      }
    }
  }

  // Extra quotations Q005–Q036
  for (let i = 5; i <= 36; i += 1) {
    const id = `Q${pad(i)}`;
    if (quotations.some((q) => q.Quote_ID === id)) continue;
    const cust = activeCustomers[(i + 2) % activeCustomers.length];
    const status = QUOTE_STATUSES[i % QUOTE_STATUSES.length];
    const p1 = activeProducts[(i + 1) % activeProducts.length];
    const p2 = activeProducts[(i + 4) % activeProducts.length];
    const qty1 = 2 + (i % 5);
    const qty2 = 1 + (i % 4);
    const line1 = p1.List_Price * qty1;
    const line2 = p2.List_Price * qty2;
    const subtotal = line1 + line2;
    const discount = i % 4 === 0 ? Math.round(subtotal * 0.05) : 0;
    const taxBase = subtotal - discount;
    const tax = Math.round(taxBase * 0.05);
    const quoteDate = dateOffset(input.baseDate, -(i % 18));
    const validUntil =
      status === "Expired"
        ? dateOffset(quoteDate, 5)
        : dateOffset(quoteDate, 14);

    quotations.push({
      Quote_ID: id,
      Customer_ID: cust.Customer_ID,
      Quote_Date: quoteDate,
      Valid_Until: validUntil,
      Status: status === "Expired" ? "Sent" : status, // expiry scan will flip Sent past due
      Discount_Amount: discount,
      Tax_Rate: 0.05,
      Subtotal: subtotal,
      Tax_Amount: tax,
      Total: taxBase + tax,
      Notes: status === "Draft" ? "草稿示範報價" : `示範報價 ${id}`,
      Created_At: `${quoteDate}T03:00:00.000Z`,
      Updated_At: `${quoteDate}T05:00:00.000Z`,
    });

    // For Expired seed intent: set Valid_Until in the past while Status Sent
    if (status === "Expired") {
      const q = quotations[quotations.length - 1];
      q.Status = "Sent";
      q.Valid_Until = dateOffset(input.baseDate, -3);
      q.Notes = "逾期示範：載入時應自動標 Expired";
    }

    quotationDetails.push(
      {
        Quote_ID: id,
        Line_No: 1,
        Product_ID: p1.Product_ID,
        Product_Name_Snapshot: p1.Product_Name,
        Qty: qty1,
        Unit_Price: p1.List_Price,
        Line_Amount: line1,
      },
      {
        Quote_ID: id,
        Line_No: 2,
        Product_ID: p2.Product_ID,
        Product_Name_Snapshot: p2.Product_Name,
        Qty: qty2,
        Unit_Price: p2.List_Price,
        Line_Amount: line2,
      },
    );
  }

  return {
    orders,
    orderDetails,
    quotations,
    quotationDetails,
    receivables,
    payments,
    stockMoves,
  };
}
