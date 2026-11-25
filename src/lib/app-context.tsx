"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  ensureReceivableForOrder,
  recordPayment,
  voidReceivableForUnship,
  type ArActionResult,
} from "./ar-rules";
import {
  adjustOnHand,
  confirmOrderWithReserve,
  createStockMove,
  deductStockForShip,
  getInventorySnapshot,
  postStockMove,
  releaseOrderReserves,
  restoreStockForUnship,
  setSafetyStock,
  type CreateMoveInput,
  type InventoryActionResult,
} from "./inventory-rules";
import {
  cancelOrder as cancelOrderRule,
  convertQuoteToOrder,
  ensureDetailShape,
  ensureOrderShape,
  reopenOrder as reopenOrderRule,
  updateDraftOrder as updateDraftOrderRule,
  WEEK8_BUSINESS_DATE,
  type DraftPatch,
  type OrderActionResult,
} from "./order-rules";
import {
  baselineCustomers,
  baselineOrderDetails,
  baselineOrders,
  customers as seedCustomers,
  demoCustomers,
  initialOrders,
  initialPayments,
  initialQuotationDetails,
  initialQuotations,
  initialReceivables,
  initialStockMoves,
  initialUsers,
  orderDetails as seedOrderDetails,
  products as seedProducts,
} from "./sample-data";
import {
  applyCustomerPatch,
  buildNewCustomer,
  findDuplicateNameHint,
  nextCustomerId,
  type ActionResult,
} from "./customer-rules";
import {
  applyProductPatch,
  buildNewProduct,
  migrateProductShape,
  nextProductId,
  type ProductActionResult,
} from "./product-rules";
import {
  applyExpiryScan,
  createQuotation as buildQuotation,
  nextQuoteId,
  todayLocalDate,
  transitionQuoteStatus,
  updateDraftQuotation,
  type QuoteActionResult,
} from "./quotation-rules";
import { computeKpi } from "./kpi";
import {
  createShipmentDraft,
  orderHasShipments,
  postShipment,
  updateDeliveryStatus,
  updateShipmentDraft,
  type CreateShipmentDraftInput,
  type ShipmentActionResult,
  type UpdateDeliveryInput,
  type UpdateShipmentDraftInput,
} from "./shipment-rules";
import type {
  AppUser,
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
  DeliveryStatusLog,
  OrderAuditEntry,
  Payment,
  Product,
  ProductCreateInput,
  ProductUpdateInput,
  Quotation,
  QuotationCreateInput,
  QuotationDetail,
  QuotationUpdateInput,
  QuoteStatus,
  Receivable,
  SalesOrder,
  SalesOrderDetail,
  Shipment,
  ShipmentDetail,
  StockMove,
  StockReservation,
} from "./types";

const STORAGE_KEY = "norway-coffee-erp-demo-v8";
const STORAGE_VERSION = 8 as const;

interface PersistedState {
  version: typeof STORAGE_VERSION;
  users: AppUser[];
  orders: SalesOrder[];
  orderDetails: SalesOrderDetail[];
  customers: Customer[];
  products: Product[];
  quotations: Quotation[];
  quotationDetails: QuotationDetail[];
  stockMoves: StockMove[];
  stockReservations: StockReservation[];
  shipments: Shipment[];
  shipmentDetails: ShipmentDetail[];
  deliveryLogs: DeliveryStatusLog[];
  receivables: Receivable[];
  payments: Payment[];
  orderAudits: OrderAuditEntry[];
  currentUserId: string;
}

interface AppContextValue {
  currentUserId: string;
  currentUser: AppUser;
  users: AppUser[];
  orders: SalesOrder[];
  customers: Customer[];
  products: Product[];
  quotations: Quotation[];
  quotationDetails: QuotationDetail[];
  orderDetails: SalesOrderDetail[];
  stockMoves: StockMove[];
  stockReservations: StockReservation[];
  shipments: Shipment[];
  shipmentDetails: ShipmentDetail[];
  deliveryLogs: DeliveryStatusLog[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  setStockMoves: Dispatch<SetStateAction<StockMove[]>>;
  setStockReservations: Dispatch<SetStateAction<StockReservation[]>>;
  receivables: Receivable[];
  payments: Payment[];
  kpi: ReturnType<typeof computeKpi>;
  hydrated: boolean;
  persistLabel: string;
  lastSavedAt: number | null;
  switchUser: (userId: string) => { ok: boolean; message?: string };
  setUserActive: (
    userId: string,
    isActive: boolean,
  ) => { ok: boolean; message?: string };
  orderAudits: OrderAuditEntry[];
  convertAcceptedQuote: (
    quoteId: string,
    options?: {
      asOfDate?: string;
      requestedDate?: string;
      promisedDate?: string;
    },
  ) => OrderActionResult;
  saveDraftOrder: (
    orderId: string,
    patch: DraftPatch,
  ) => OrderActionResult;
  confirmSalesOrder: (orderId: string) => OrderActionResult;
  cancelSalesOrder: (orderId: string, reason: string) => OrderActionResult;
  reopenSalesOrder: (orderId: string, reason: string) => OrderActionResult;
  shipConfirmedOrder: (orderId: string) => { ok: boolean; message?: string };
  unshipOrder: (orderId: string) => { ok: boolean; message?: string };
  createShipmentFromOrder: (
    input: Omit<CreateShipmentDraftInput, "role" | "user">,
  ) => ShipmentActionResult;
  saveShipmentDraft: (
    input: Omit<UpdateShipmentDraftInput, "role" | "user">,
  ) => ShipmentActionResult;
  postShipmentDoc: (
    shipmentId: string,
    options?: { receiptNote?: string },
  ) => ShipmentActionResult;
  updateShipmentDelivery: (
    input: Omit<UpdateDeliveryInput, "role" | "user">,
  ) => ShipmentActionResult;
  /** @deprecated 僅相容舊 ClassroomSim；請用 cancel／confirm／ship */
  setOrderStatus: (
    orderId: string,
    status: string,
  ) => { ok: boolean; message?: string };
  adjustInventory: (
    productId: string,
    delta: number,
    note?: string,
  ) => InventoryActionResult;
  prepareWeek10Lab: () => { ok: boolean; message?: string };
  /** 準備第 11 週起點：SO-B 已確認、T001 26/15/11、T002 8/1/7 */
  prepareWeek11Lab: () => {
    ok: boolean;
    message?: string;
    orderId?: string;
  };
  createInventoryMove: (
    input: Omit<CreateMoveInput, "role"> & { role?: never },
  ) => InventoryActionResult;
  postInventoryMove: (moveId: string) => InventoryActionResult;
  setProductSafety: (productId: string, safety: number) => InventoryActionResult;
  inventorySnap: (productId: string) => ReturnType<typeof getInventorySnapshot>;
  recordArPayment: (
    arId: string,
    amount: number | string,
    payDate: string,
    note?: string,
  ) => ArActionResult;
  createCustomer: (input: CustomerCreateInput) => ActionResult;
  updateCustomer: (
    customerId: string,
    patch: CustomerUpdateInput,
  ) => ActionResult;
  setCustomerActive: (
    customerId: string,
    isActive: boolean,
  ) => ActionResult;
  softDeleteCustomer: (customerId: string) => ActionResult;
  tryForceCreditLimit: (
    customerId: string,
    creditLimit: number,
  ) => ActionResult;
  tryForceSoftDelete: (customerId: string) => ActionResult;
  createProduct: (input: ProductCreateInput) => ProductActionResult;
  updateProduct: (
    productId: string,
    patch: ProductUpdateInput,
  ) => ProductActionResult;
  softDeactivateProduct: (productId: string) => ProductActionResult;
  tryForceProductPrice: (
    productId: string,
    listPrice: number,
  ) => ProductActionResult;
  createQuote: (input: QuotationCreateInput) => QuoteActionResult;
  updateDraftQuote: (
    quoteId: string,
    input: QuotationUpdateInput,
  ) => QuoteActionResult;
  setQuoteStatus: (
    quoteId: string,
    status: QuoteStatus,
  ) => QuoteActionResult;
  tryForceAcceptQuote: (quoteId: string) => QuoteActionResult;
  resetDemoData: () => void;
  loadBaselineData: () => void;
  loadDemoData: () => void;
  /** 匯出本機示範 JSON（含訂單／報價／庫存等） */
  exportDemoJson: () => string;
  /** 匯入示範 JSON；格式錯誤時拒絕並保留現況 */
  importDemoJson: (raw: string) => { ok: boolean; message: string };
  clearOrders: () => void;
  simLoadError: boolean;
  setSimLoadError: (v: boolean) => void;
  canAccessSettings: boolean;
  customerName: (id: string) => string;
  productName: (id: string) => string;
  peekNextCustomerId: () => string;
  peekNextProductId: () => string;
  peekNextQuoteId: () => string;
}

const AppContext = createContext<AppContextValue | null>(null);

function cloneSeed(): Omit<PersistedState, "version"> {
  return {
    users: initialUsers.map((u) => ({ ...u })),
    orders: initialOrders.map((o) => ensureOrderShape({ ...o })),
    orderDetails: seedOrderDetails.map((d) => ensureDetailShape({ ...d })),
    customers: seedCustomers.map((c) => ({ ...c })),
    products: seedProducts.map((p) => ({ ...p })),
    quotations: initialQuotations.map((q) => ({ ...q })),
    quotationDetails: initialQuotationDetails.map((d) => ({ ...d })),
    stockMoves: initialStockMoves.map((m) => ({ ...m })),
    stockReservations: [],
    shipments: [],
    shipmentDetails: [],
    deliveryLogs: [],
    receivables: initialReceivables.map((r) => ({ ...r })),
    payments: initialPayments.map((p) => ({ ...p })),
    orderAudits: [],
    currentUserId: "U001",
  };
}

function isCustomerShape(c: unknown): c is Customer {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.Customer_ID === "string" &&
    typeof o.Customer_Name === "string" &&
    typeof o.Customer_Type === "string" &&
    typeof o.Payment_Terms === "string" &&
    typeof o.Credit_Limit === "number" &&
    typeof o.Is_Active === "boolean"
  );
}

function normalizeProducts(raw: unknown[]): Product[] {
  const out: Product[] = [];
  for (const item of raw) {
    const m = migrateProductShape(item);
    if (m) out.push(m);
  }
  return out;
}

function migrateFromLegacy(parsed: {
  version?: number;
  users?: unknown;
  orders?: unknown;
  orderDetails?: unknown;
  customers?: unknown;
  products?: unknown;
  quotations?: unknown;
  quotationDetails?: unknown;
  stockMoves?: unknown;
  receivables?: unknown;
  payments?: unknown;
  currentUserId?: unknown;
}): PersistedState | null {
  if (
    parsed?.version !== 2 &&
    parsed?.version !== 3 &&
    parsed?.version !== 4 &&
    parsed?.version !== 5 &&
    parsed?.version !== 6 &&
    parsed?.version !== 7
  ) {
    return null;
  }
  if (
    !Array.isArray(parsed.users) ||
    !Array.isArray(parsed.orders) ||
    !Array.isArray(parsed.customers) ||
    !Array.isArray(parsed.products) ||
    typeof parsed.currentUserId !== "string"
  ) {
    return null;
  }
  if (!parsed.customers.every(isCustomerShape)) return null;
  const products = normalizeProducts(parsed.products);
  if (!products.length) return null;
  const seed = cloneSeed();
  const ids = new Set(products.map((p) => p.Product_ID));
  for (const p of seed.products) {
    if (!ids.has(p.Product_ID)) products.push({ ...p });
  }
  const quotations =
    Array.isArray(parsed.quotations) && parsed.quotations.length
      ? (parsed.quotations as Quotation[]).map((q) => ({ ...q }))
      : seed.quotations;
  const quotationDetails =
    Array.isArray(parsed.quotationDetails) && parsed.quotationDetails.length
      ? (parsed.quotationDetails as QuotationDetail[]).map((d) => ({ ...d }))
      : seed.quotationDetails;
  const orderDetails =
    Array.isArray(parsed.orderDetails) && parsed.orderDetails.length
      ? (parsed.orderDetails as SalesOrderDetail[]).map((d) => ({ ...d }))
      : seed.orderDetails;
  const stockMoves =
    Array.isArray(parsed.stockMoves) && parsed.stockMoves.length
      ? (parsed.stockMoves as StockMove[]).map((m) => ({ ...m }))
      : seed.stockMoves;
  const receivables =
    Array.isArray(parsed.receivables) && parsed.receivables.length
      ? (parsed.receivables as Receivable[]).map((r) => ({ ...r }))
      : seed.receivables;
  const payments = Array.isArray(parsed.payments)
    ? (parsed.payments as Payment[]).map((p) => ({ ...p }))
    : seed.payments;
  const orders = (parsed.orders as SalesOrder[]).map((o) =>
    ensureOrderShape({ ...o }),
  );
  const normalizedDetails = orderDetails.map((d) => ensureDetailShape(d));

  const extra = parsed as {
    stockReservations?: StockReservation[];
    shipments?: Shipment[];
    shipmentDetails?: ShipmentDetail[];
    deliveryLogs?: DeliveryStatusLog[];
    orderAudits?: OrderAuditEntry[];
  };

  return {
    version: STORAGE_VERSION,
    users: parsed.users as AppUser[],
    orders,
    orderDetails: normalizedDetails,
    customers: parsed.customers as Customer[],
    products,
    quotations,
    quotationDetails,
    stockMoves,
    stockReservations: Array.isArray(extra.stockReservations)
      ? extra.stockReservations.map((r) => ({ ...r }))
      : [],
    shipments: Array.isArray(extra.shipments)
      ? extra.shipments.map((s) => ({ ...s }))
      : [],
    shipmentDetails: Array.isArray(extra.shipmentDetails)
      ? extra.shipmentDetails.map((d) => ({ ...d }))
      : [],
    deliveryLogs: Array.isArray(extra.deliveryLogs)
      ? extra.deliveryLogs.map((l) => ({ ...l }))
      : [],
    receivables,
    payments,
    orderAudits: Array.isArray(extra.orderAudits)
      ? extra.orderAudits.map((a) => ({ ...a }))
      : [],
    currentUserId: parsed.currentUserId,
  };
}

function readStorage(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem("norway-coffee-erp-demo-v7") ??
      window.localStorage.getItem("norway-coffee-erp-demo-v5") ??
      window.localStorage.getItem("norway-coffee-erp-demo-v4");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version?: number;
      orders?: unknown[];
      shipments?: Shipment[];
      shipmentDetails?: ShipmentDetail[];
      deliveryLogs?: DeliveryStatusLog[];
      stockReservations?: StockReservation[];
      orderAudits?: OrderAuditEntry[];
    };
    // v8＝第 11 週出貨；v7 升檔補空出貨陣列；缺欄一律容錯成 []
    if (parsed?.version === 8 || parsed?.version === 7) {
      const full = parsed as Partial<PersistedState> & { version?: number };
      const seed = cloneSeed();
      const products = Array.isArray(full.products)
        ? normalizeProducts(full.products as unknown[])
        : seed.products;
      if (!products.length) return null;
      const users = Array.isArray(full.users) && full.users.length
        ? (full.users as AppUser[])
        : seed.users;
      return {
        version: STORAGE_VERSION,
        users,
        orders: Array.isArray(full.orders)
          ? (full.orders as SalesOrder[]).map((o) => ensureOrderShape(o))
          : seed.orders,
        orderDetails: Array.isArray(full.orderDetails)
          ? (full.orderDetails as SalesOrderDetail[]).map((d) =>
              ensureDetailShape(d),
            )
          : seed.orderDetails,
        customers:
          Array.isArray(full.customers) && full.customers.length
            ? (full.customers as Customer[])
            : seed.customers,
        products,
        quotations: Array.isArray(full.quotations)
          ? (full.quotations as Quotation[])
          : seed.quotations,
        quotationDetails: Array.isArray(full.quotationDetails)
          ? (full.quotationDetails as QuotationDetail[])
          : seed.quotationDetails,
        stockMoves: Array.isArray(full.stockMoves)
          ? (full.stockMoves as StockMove[])
          : seed.stockMoves,
        stockReservations: Array.isArray(full.stockReservations)
          ? (full.stockReservations as StockReservation[])
          : [],
        shipments: Array.isArray(full.shipments)
          ? (full.shipments as Shipment[]).filter(
              (s) => s && typeof s.Shipment_ID === "string",
            )
          : [],
        shipmentDetails: Array.isArray(full.shipmentDetails)
          ? (full.shipmentDetails as ShipmentDetail[]).filter(
              (d) => d && typeof d.Shipment_ID === "string",
            )
          : [],
        deliveryLogs: Array.isArray(full.deliveryLogs)
          ? (full.deliveryLogs as DeliveryStatusLog[])
          : [],
        receivables: Array.isArray(full.receivables)
          ? (full.receivables as Receivable[])
          : seed.receivables,
        payments: Array.isArray(full.payments)
          ? (full.payments as Payment[])
          : seed.payments,
        orderAudits: Array.isArray(full.orderAudits)
          ? (full.orderAudits as OrderAuditEntry[])
          : [],
        currentUserId:
          typeof full.currentUserId === "string"
            ? full.currentUserId
            : "U001",
      };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStorage(state: PersistedState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const seed = useMemo(() => cloneSeed(), []);
  const [users, setUsers] = useState<AppUser[]>(seed.users);
  const [orders, setOrders] = useState<SalesOrder[]>(seed.orders);
  const [orderDetails, setOrderDetails] = useState<SalesOrderDetail[]>(
    seed.orderDetails,
  );
  const [customers, setCustomers] = useState<Customer[]>(seed.customers);
  const [products, setProducts] = useState<Product[]>(seed.products);
  const [quotations, setQuotations] = useState<Quotation[]>(seed.quotations);
  const [quotationDetails, setQuotationDetails] = useState<QuotationDetail[]>(
    seed.quotationDetails,
  );
  const [stockMoves, setStockMoves] = useState<StockMove[]>(seed.stockMoves);
  const [stockReservations, setStockReservations] = useState<StockReservation[]>(
    seed.stockReservations ?? [],
  );
  const [shipments, setShipments] = useState<Shipment[]>(seed.shipments ?? []);
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetail[]>(
    seed.shipmentDetails ?? [],
  );
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryStatusLog[]>(
    seed.deliveryLogs ?? [],
  );
  const [receivables, setReceivables] = useState<Receivable[]>(
    seed.receivables,
  );
  const [payments, setPayments] = useState<Payment[]>(seed.payments);
  const [orderAudits, setOrderAudits] = useState<OrderAuditEntry[]>(
    seed.orderAudits,
  );
  const [currentUserId, setCurrentUserId] = useState(seed.currentUserId);
  const ordersRef = useRef(orders);
  const orderDetailsRef = useRef(orderDetails);
  const orderAuditsRef = useRef(orderAudits);
  const customersRef = useRef(customers);
  const productsRef = useRef(products);
  const quotationsRef = useRef(quotations);
  const quotationDetailsRef = useRef(quotationDetails);
  const receivablesRef = useRef(receivables);
  const paymentsRef = useRef(payments);
  const stockMovesRef = useRef(stockMoves);
  const stockReservationsRef = useRef(stockReservations);
  const shipmentsRef = useRef(shipments);
  const shipmentDetailsRef = useRef(shipmentDetails);
  const deliveryLogsRef = useRef(deliveryLogs);
  const usersRef = useRef(users);
  const currentUserIdRef = useRef(currentUserId);
  ordersRef.current = orders;
  orderDetailsRef.current = orderDetails;
  orderAuditsRef.current = orderAudits;
  customersRef.current = customers;
  productsRef.current = products;
  quotationsRef.current = quotations;
  quotationDetailsRef.current = quotationDetails;
  receivablesRef.current = receivables;
  paymentsRef.current = payments;
  stockMovesRef.current = stockMoves;
  stockReservationsRef.current = stockReservations;
  shipmentsRef.current = shipments;
  shipmentDetailsRef.current = shipmentDetails;
  deliveryLogsRef.current = deliveryLogs;
  usersRef.current = users;
  currentUserIdRef.current = currentUserId;
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [simLoadError, setSimLoadError] = useState(false);

  useEffect(() => {
    try {
      try {
        window.localStorage.removeItem("norway-coffee-erp-demo-v1");
      } catch {
        /* ignore */
      }
      const stored = readStorage();
      const seedData = cloneSeed();
      const src = stored ?? seedData;
      // 一律以陣列容錯套用，避免缺欄 .map 拋錯導致永遠卡在「載入中」白屏
      const usersSafe = Array.isArray(src.users) ? src.users : seedData.users;
      const ordersSafe = Array.isArray(src.orders)
        ? src.orders.map((o) => ensureOrderShape(o))
        : seedData.orders;
      const detailsSafe = Array.isArray(src.orderDetails)
        ? src.orderDetails.map((d) => ensureDetailShape(d))
        : seedData.orderDetails;
      const customersSafe = Array.isArray(src.customers)
        ? src.customers
        : seedData.customers;
      const productsSafe = Array.isArray(src.products)
        ? src.products
        : seedData.products;
      const quotesSafe = Array.isArray(src.quotations)
        ? src.quotations
        : seedData.quotations;
      const qDetailsSafe = Array.isArray(src.quotationDetails)
        ? src.quotationDetails
        : seedData.quotationDetails;
      const movesSafe = Array.isArray(src.stockMoves)
        ? src.stockMoves
        : seedData.stockMoves;
      const reservesSafe = Array.isArray(src.stockReservations)
        ? src.stockReservations
        : [];
      const shipsSafe = Array.isArray(src.shipments)
        ? src.shipments.filter((s) => s && typeof s.Shipment_ID === "string")
        : [];
      const shipDetailsSafe = Array.isArray(src.shipmentDetails)
        ? src.shipmentDetails.filter(
            (d) => d && typeof d.Shipment_ID === "string",
          )
        : [];
      const logsSafe = Array.isArray(src.deliveryLogs) ? src.deliveryLogs : [];
      const arSafe = Array.isArray(src.receivables)
        ? src.receivables
        : seedData.receivables;
      const paySafe = Array.isArray(src.payments)
        ? src.payments
        : seedData.payments;
      const auditsSafe = Array.isArray(src.orderAudits) ? src.orderAudits : [];

      usersRef.current = usersSafe.map((u) => ({ ...u }));
      ordersRef.current = ordersSafe.map((o) => ({ ...o }));
      orderDetailsRef.current = detailsSafe.map((d) => ({ ...d }));
      customersRef.current = customersSafe.map((c) => ({ ...c }));
      productsRef.current = productsSafe.map((p) => ({ ...p }));
      const scanned = applyExpiryScan(
        quotesSafe.map((q) => ({ ...q })),
        todayLocalDate(),
      );
      quotationsRef.current = scanned.quotations;
      quotationDetailsRef.current = qDetailsSafe.map((d) => ({ ...d }));
      stockMovesRef.current = movesSafe.map((m) => ({ ...m }));
      stockReservationsRef.current = reservesSafe.map((r) => ({ ...r }));
      shipmentsRef.current = shipsSafe.map((s) => ({ ...s }));
      shipmentDetailsRef.current = shipDetailsSafe.map((d) => ({ ...d }));
      deliveryLogsRef.current = logsSafe.map((l) => ({ ...l }));
      receivablesRef.current = arSafe.map((r) => ({ ...r }));
      paymentsRef.current = paySafe.map((p) => ({ ...p }));
      orderAuditsRef.current = auditsSafe.map((a) => ({ ...a }));
      const activeId =
        usersRef.current.find((u) => u.User_ID === src.currentUserId)
          ?.Is_Active !== false
          ? src.currentUserId || "U001"
          : "U001";
      currentUserIdRef.current = activeId;

      setUsers(usersRef.current);
      setOrders(ordersRef.current);
      setOrderDetails(orderDetailsRef.current);
      setCustomers(customersRef.current);
      setProducts(productsRef.current);
      setQuotations(quotationsRef.current);
      setQuotationDetails(quotationDetailsRef.current);
      setStockMoves(stockMovesRef.current);
      setStockReservations(stockReservationsRef.current);
      setShipments(shipmentsRef.current);
      setShipmentDetails(shipmentDetailsRef.current);
      setDeliveryLogs(deliveryLogsRef.current);
      setReceivables(receivablesRef.current);
      setPayments(paymentsRef.current);
      setOrderAudits(orderAuditsRef.current);
      setCurrentUserId(activeId);
      writeStorage({
        version: STORAGE_VERSION,
        users: usersRef.current,
        orders: ordersRef.current,
        orderDetails: orderDetailsRef.current,
        customers: customersRef.current,
        products: productsRef.current,
        quotations: quotationsRef.current,
        quotationDetails: quotationDetailsRef.current,
        stockMoves: stockMovesRef.current,
        stockReservations: stockReservationsRef.current,
        shipments: shipmentsRef.current,
        shipmentDetails: shipmentDetailsRef.current,
        deliveryLogs: deliveryLogsRef.current,
        receivables: receivablesRef.current,
        payments: paymentsRef.current,
        orderAudits: orderAuditsRef.current,
        currentUserId: activeId,
      });
      setLastSavedAt(Date.now());
    } catch {
      // 任何 schema 例外都回落種子，絕不能卡住 hydrated＝白屏
      try {
        const seedData = cloneSeed();
        usersRef.current = seedData.users;
        ordersRef.current = seedData.orders;
        orderDetailsRef.current = seedData.orderDetails;
        customersRef.current = seedData.customers;
        productsRef.current = seedData.products;
        quotationsRef.current = seedData.quotations;
        quotationDetailsRef.current = seedData.quotationDetails;
        stockMovesRef.current = seedData.stockMoves;
        stockReservationsRef.current = [];
        shipmentsRef.current = [];
        shipmentDetailsRef.current = [];
        deliveryLogsRef.current = [];
        receivablesRef.current = seedData.receivables;
        paymentsRef.current = seedData.payments;
        orderAuditsRef.current = [];
        currentUserIdRef.current = "U001";
        setUsers(seedData.users);
        setOrders(seedData.orders);
        setOrderDetails(seedData.orderDetails);
        setCustomers(seedData.customers);
        setProducts(seedData.products);
        setQuotations(seedData.quotations);
        setQuotationDetails(seedData.quotationDetails);
        setStockMoves(seedData.stockMoves);
        setStockReservations([]);
        setShipments([]);
        setShipmentDetails([]);
        setDeliveryLogs([]);
        setReceivables(seedData.receivables);
        setPayments(seedData.payments);
        setOrderAudits([]);
        setCurrentUserId("U001");
        writeStorage({ version: STORAGE_VERSION, ...seedData });
      } catch {
        /* last resort: still mark hydrated */
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStorage({
      version: STORAGE_VERSION,
      users,
      orders,
      orderDetails,
      customers,
      products,
      quotations,
      quotationDetails,
      stockMoves,
      stockReservations,
      shipments,
      shipmentDetails,
      deliveryLogs,
      receivables,
      payments,
      orderAudits,
      currentUserId,
    });
    setLastSavedAt(Date.now());
  }, [
    hydrated,
    users,
    orders,
    orderDetails,
    customers,
    products,
    quotations,
    quotationDetails,
    stockMoves,
    stockReservations,
    shipments,
    shipmentDetails,
    deliveryLogs,
    receivables,
    orderAudits,
    payments,
    currentUserId,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as PersistedState;
        if (parsed?.version !== STORAGE_VERSION) return;
        setUsers(parsed.users.map((u) => ({ ...u })));
        setOrders(parsed.orders.map((o) => ({ ...o })));
        setOrderDetails(parsed.orderDetails.map((d) => ({ ...d })));
        setCustomers(parsed.customers.map((c) => ({ ...c })));
        setProducts(parsed.products.map((p) => ({ ...p })));
        setQuotations(parsed.quotations.map((q) => ({ ...q })));
        setQuotationDetails(parsed.quotationDetails.map((d) => ({ ...d })));
        setStockMoves(parsed.stockMoves.map((m) => ({ ...m })));
        setStockReservations(
          (parsed.stockReservations ?? []).map((r) => ({ ...r })),
        );
        setShipments((parsed.shipments ?? []).map((s) => ({ ...s })));
        setShipmentDetails(
          (parsed.shipmentDetails ?? []).map((d) => ({ ...d })),
        );
        setDeliveryLogs((parsed.deliveryLogs ?? []).map((l) => ({ ...l })));
        setReceivables(parsed.receivables.map((r) => ({ ...r })));
        setPayments(parsed.payments.map((p) => ({ ...p })));
        setCurrentUserId(parsed.currentUserId);
        setLastSavedAt(Date.now());
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [hydrated]);

  const currentUser = useMemo(
    () => users.find((u) => u.User_ID === currentUserId) ?? users[0],
    [users, currentUserId],
  );

  const canAccessSettings = currentUser.Role === "Admin";

  const kpi = useMemo(
    () => computeKpi(customers, orders),
    [customers, orders],
  );

  const customerName = useCallback(
    (id: string) =>
      customers.find((c) => c.Customer_ID === id)?.Customer_Name ?? id,
    [customers],
  );

  const productName = useCallback(
    (id: string) =>
      products.find((p) => p.Product_ID === id)?.Product_Name ?? id,
    [products],
  );

  const peekNextCustomerId = useCallback(
    () => nextCustomerId(customers),
    [customers],
  );
  const peekNextProductId = useCallback(
    () => nextProductId(products),
    [products],
  );
  const peekNextQuoteId = useCallback(
    () => nextQuoteId(quotations),
    [quotations],
  );

  const persistLabel = hydrated
    ? "資料已同步 · 已儲存於本機"
    : "載入本機資料中…";

  const activeUser = useCallback(() => {
    const id = currentUserIdRef.current;
    return (
      usersRef.current.find((u) => u.User_ID === id) ?? usersRef.current[0]
    );
  }, []);

  const switchUser = useCallback(
    (userId: string) => {
      const target = usersRef.current.find((u) => u.User_ID === userId);
      if (!target) return { ok: false, message: "找不到該使用者。" };
      if (!target.Is_Active) {
        return {
          ok: false,
          message: `${target.User_ID} 已停用，無法切換為此使用者。`,
        };
      }
      currentUserIdRef.current = userId;
      setCurrentUserId(userId);
      // Staff 不可留在設定頁；驗收／其他頁面需可切角色連續測，勿一律踢回首頁
      if (target.Role !== "Admin" && typeof window !== "undefined") {
        const path = window.location.pathname.replace(/\/$/, "") || "/";
        if (path.endsWith("/settings")) router.push("/");
      }
      return { ok: true };
    },
    [router],
  );

  const setUserActive = useCallback(
    (userId: string, isActive: boolean) => {
      if (activeUser().Role !== "Admin") {
        return {
          ok: false,
          message: "目前角色無法使用此功能（無權限修改使用者啟用狀態）。",
        };
      }
      if (userId !== "U002") {
        return { ok: false, message: "本週教學僅允許修改 U002 的啟用狀態。" };
      }
      setUsers((prev) => {
        const next = prev.map((u) =>
          u.User_ID === userId ? { ...u, Is_Active: isActive } : u,
        );
        usersRef.current = next;
        return next;
      });
      return { ok: true };
    },
    [activeUser],
  );

  const convertAcceptedQuote = useCallback(
    (
      quoteId: string,
      options?: {
        asOfDate?: string;
        requestedDate?: string;
        promisedDate?: string;
      },
    ): OrderActionResult => {
      const quote = quotations.find((q) => q.Quote_ID === quoteId);
      if (!quote) return { ok: false, message: "找不到該報價。" };
      const existing = ordersRef.current.find((o) => o.Quote_ID === quoteId);
      if (existing) {
        return {
          ok: true,
          message: `此報價已轉為 ${existing.Order_ID}，開啟原訂單。`,
          order: existing,
          details: orderDetailsRef.current.filter(
            (d) => d.Order_ID === existing.Order_ID,
          ),
        };
      }
      const result = convertQuoteToOrder(
        quote,
        quotationDetails,
        customers,
        productsRef.current,
        ordersRef.current,
        orderDetailsRef.current,
        {
          asOfDate: options?.asOfDate ?? WEEK8_BUSINESS_DATE,
          requestedDate: options?.requestedDate ?? "2026-11-23",
          promisedDate: options?.promisedDate ?? "2026-11-23",
        },
      );
      if (!result.ok || !result.order || !result.details) return result;
      ordersRef.current = [...ordersRef.current, result.order];
      orderDetailsRef.current = [
        ...orderDetailsRef.current,
        ...result.details,
      ];
      setOrders(ordersRef.current);
      setOrderDetails(orderDetailsRef.current);
      return result;
    },
    [quotations, quotationDetails, customers],
  );

  const saveDraftOrder = useCallback(
    (orderId: string, patch: DraftPatch): OrderActionResult => {
      const order = ordersRef.current.find((o) => o.Order_ID === orderId);
      if (!order) return { ok: false, message: "找不到該訂單。" };
      const role = activeUser().Role;
      if (order.Order_Status === "Confirmed" && role !== "Admin") {
        return {
          ok: false,
          message: "Staff 不可修改已確認訂單。",
        };
      }
      if (order.Order_Status === "Confirmed" && role === "Admin") {
        return {
          ok: false,
          message: "已確認訂單請先填原因重開為草稿後再修改。",
        };
      }
      const details = orderDetailsRef.current.filter(
        (d) => d.Order_ID === orderId,
      );
      const result = updateDraftOrderRule(order, details, patch, role);
      if (!result.ok || !result.order || !result.details) return result;
      ordersRef.current = ordersRef.current.map((o) =>
        o.Order_ID === orderId ? result.order! : o,
      );
      orderDetailsRef.current = [
        ...orderDetailsRef.current.filter((d) => d.Order_ID !== orderId),
        ...result.details,
      ];
      setOrders(ordersRef.current);
      setOrderDetails(orderDetailsRef.current);
      return result;
    },
    [activeUser],
  );

  const confirmSalesOrder = useCallback(
    (orderId: string): OrderActionResult => {
      const order = ordersRef.current.find((o) => o.Order_ID === orderId);
      if (!order) return { ok: false, message: "找不到該訂單。" };
      const details = orderDetailsRef.current.filter(
        (d) => d.Order_ID === orderId,
      );
      const result = confirmOrderWithReserve(
        order,
        details,
        productsRef.current,
        stockMovesRef.current,
        stockReservationsRef.current,
      );
      if (!result.ok || !result.order) {
        return { ok: false, message: result.message };
      }
      ordersRef.current = ordersRef.current.map((o) =>
        o.Order_ID === orderId ? result.order! : o,
      );
      setOrders(ordersRef.current);
      if (result.reservations) {
        stockReservationsRef.current = result.reservations;
        setStockReservations(result.reservations);
      }
      return { ok: true, message: result.message, order: result.order, details };
    },
    [],
  );

  const cancelSalesOrder = useCallback(
    (orderId: string, reason: string): OrderActionResult => {
      const order = ordersRef.current.find((o) => o.Order_ID === orderId);
      if (!order) return { ok: false, message: "找不到該訂單。" };
      if (orderHasShipments(orderId, shipmentsRef.current)) {
        return {
          ok: false,
          message:
            "此訂單已有出貨單，本週不可沿用第 8 週取消；請保留出貨紀錄待管理者處理。",
        };
      }
      const user = activeUser();
      const result = cancelOrderRule(
        order,
        user.Role,
        reason,
        user,
        orderAuditsRef.current,
      );
      if (!result.ok || !result.order) return result;
      ordersRef.current = ordersRef.current.map((o) =>
        o.Order_ID === orderId ? result.order! : o,
      );
      setOrders(ordersRef.current);
      if (result.audit) {
        orderAuditsRef.current = [...orderAuditsRef.current, result.audit];
        setOrderAudits(orderAuditsRef.current);
      }
      const released = releaseOrderReserves(
        orderId,
        stockReservationsRef.current,
      );
      stockReservationsRef.current = released.reservations;
      setStockReservations(released.reservations);
      return {
        ...result,
        message:
          (result.message ?? "訂單已取消。") +
          (released.releasedQty
            ? ` 已釋放保留 ${released.releasedQty}（現有量不變）。`
            : ""),
      };
    },
    [activeUser],
  );

  const reopenSalesOrder = useCallback(
    (orderId: string, reason: string): OrderActionResult => {
      const order = ordersRef.current.find((o) => o.Order_ID === orderId);
      if (!order) return { ok: false, message: "找不到該訂單。" };
      if (orderHasShipments(orderId, shipmentsRef.current)) {
        return {
          ok: false,
          message:
            "此訂單已有出貨單，本週不可沿用第 8 週重開；請保留出貨紀錄待管理者處理。",
        };
      }
      const user = activeUser();
      const result = reopenOrderRule(
        order,
        user.Role,
        reason,
        user,
        orderAuditsRef.current,
      );
      if (!result.ok || !result.order) return result;
      ordersRef.current = ordersRef.current.map((o) =>
        o.Order_ID === orderId ? result.order! : o,
      );
      setOrders(ordersRef.current);
      if (result.audit) {
        orderAuditsRef.current = [...orderAuditsRef.current, result.audit];
        setOrderAudits(orderAuditsRef.current);
      }
      const released = releaseOrderReserves(
        orderId,
        stockReservationsRef.current,
      );
      stockReservationsRef.current = released.reservations;
      setStockReservations(released.reservations);
      return {
        ...result,
        message:
          (result.message ?? "已重開為草稿。") +
          (released.releasedQty
            ? ` 已先解除保留 ${released.releasedQty}（現有量不變）。`
            : ""),
      };
    },
    [activeUser],
  );

  const shipConfirmedOrder = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.Order_ID === orderId);
      if (!order) return { ok: false, message: "找不到該訂單。" };
      if (order.Order_Status !== "Confirmed") {
        return { ok: false, message: "僅已確認訂單可出貨扣庫。" };
      }
      const deduct = deductStockForShip(
        order,
        orderDetails,
        products,
        stockMoves,
        stockReservations,
      );
      if (!deduct.ok || !deduct.products || !deduct.moves || !deduct.order) {
        return { ok: false, message: deduct.message ?? "扣庫失敗。" };
      }
      const shipped = deduct.order;
      const arRes = ensureReceivableForOrder(shipped, receivables);
      setProducts(deduct.products);
      setStockMoves(deduct.moves);
      if (deduct.reservations) setStockReservations(deduct.reservations);
      setOrders((prev) =>
        prev.map((o) => (o.Order_ID === orderId ? shipped : o)),
      );
      if (arRes.receivables) setReceivables(arRes.receivables);
      return {
        ok: true,
        message: `已出貨並扣庫${arRes.receivable ? `；應收 ${arRes.receivable.AR_ID}` : ""}`,
      };
    },
    [orders, orderDetails, products, stockMoves, stockReservations, receivables],
  );

  const unshipOrder = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.Order_ID === orderId);
      if (!order) return { ok: false, message: "找不到該訂單。" };
      const voidRes = voidReceivableForUnship(orderId, receivables, payments);
      if (!voidRes.ok) return { ok: false, message: voidRes.message };
      const restore = restoreStockForUnship(
        order,
        orderDetails,
        products,
        stockMoves,
        stockReservations,
      );
      if (!restore.ok || !restore.products || !restore.moves || !restore.order) {
        return { ok: false, message: restore.message ?? "還原庫存失敗。" };
      }
      setReceivables(voidRes.receivables ?? receivables);
      setProducts(restore.products);
      setStockMoves(restore.moves);
      if (restore.reservations) setStockReservations(restore.reservations);
      setOrders((prev) =>
        prev.map((o) => (o.Order_ID === orderId ? restore.order! : o)),
      );
      return { ok: true, message: "已取消出貨並還原庫存。" };
    },
    [orders, orderDetails, products, stockMoves, stockReservations, receivables, payments],
  );

  const applyShipmentResult = useCallback((result: ShipmentActionResult) => {
    if (result.shipments) {
      shipmentsRef.current = result.shipments;
      setShipments(result.shipments);
    }
    if (result.shipmentDetails) {
      shipmentDetailsRef.current = result.shipmentDetails;
      setShipmentDetails(result.shipmentDetails);
    }
    if (result.products) {
      productsRef.current = result.products;
      setProducts(result.products);
    }
    if (result.moves) {
      stockMovesRef.current = result.moves;
      setStockMoves(result.moves);
    }
    if (result.reservations) {
      stockReservationsRef.current = result.reservations;
      setStockReservations(result.reservations);
    }
    if (result.orderDetails) {
      orderDetailsRef.current = result.orderDetails;
      setOrderDetails(result.orderDetails);
    }
    if (result.order) {
      ordersRef.current = ordersRef.current.map((o) =>
        o.Order_ID === result.order!.Order_ID ? result.order! : o,
      );
      setOrders(ordersRef.current);
    }
    if (result.deliveryLogs) {
      deliveryLogsRef.current = result.deliveryLogs;
      setDeliveryLogs(result.deliveryLogs);
    }
  }, []);

  const createShipmentFromOrder = useCallback(
    (
      input: Omit<CreateShipmentDraftInput, "role" | "user">,
    ): ShipmentActionResult => {
      const user = activeUser();
      const result = createShipmentDraft(
        { ...input, role: user.Role, user },
        ordersRef.current,
        orderDetailsRef.current,
        stockReservationsRef.current,
        productsRef.current,
        shipmentsRef.current,
        shipmentDetailsRef.current,
      );
      if (result.ok) applyShipmentResult(result);
      return result;
    },
    [activeUser, applyShipmentResult],
  );

  const saveShipmentDraft = useCallback(
    (
      input: Omit<UpdateShipmentDraftInput, "role" | "user">,
    ): ShipmentActionResult => {
      const user = activeUser();
      const result = updateShipmentDraft(
        { ...input, role: user.Role, user },
        ordersRef.current,
        orderDetailsRef.current,
        stockReservationsRef.current,
        productsRef.current,
        shipmentsRef.current,
        shipmentDetailsRef.current,
      );
      if (result.ok) applyShipmentResult(result);
      return result;
    },
    [activeUser, applyShipmentResult],
  );

  const postShipmentDoc = useCallback(
    (
      shipmentId: string,
      options?: { receiptNote?: string },
    ): ShipmentActionResult => {
      const user = activeUser();
      const result = postShipment(
        shipmentId,
        user.Role,
        user,
        ordersRef.current,
        orderDetailsRef.current,
        productsRef.current,
        stockMovesRef.current,
        stockReservationsRef.current,
        shipmentsRef.current,
        shipmentDetailsRef.current,
        deliveryLogsRef.current,
        options,
      );
      if (result.ok) applyShipmentResult(result);
      return result;
    },
    [activeUser, applyShipmentResult],
  );

  const updateShipmentDelivery = useCallback(
    (
      input: Omit<UpdateDeliveryInput, "role" | "user">,
    ): ShipmentActionResult => {
      const user = activeUser();
      const result = updateDeliveryStatus(
        { ...input, role: user.Role, user },
        shipmentsRef.current,
        deliveryLogsRef.current,
        productsRef.current,
        stockReservationsRef.current,
      );
      if (result.ok) applyShipmentResult(result);
      return result;
    },
    [activeUser, applyShipmentResult],
  );

  const setOrderStatus = useCallback(
    (orderId: string, status: string) => {
      if (status === "已出貨" || status === "ship") {
        return shipConfirmedOrder(orderId);
      }
      if (status === "Cancelled" || status === "已取消") {
        return cancelSalesOrder(orderId, "模擬取消");
      }
      if (status === "Confirmed" || status === "已確認") {
        return confirmSalesOrder(orderId);
      }
      return { ok: false, message: `請改用確認／取消／出貨操作（${status}）。` };
    },
    [shipConfirmedOrder, cancelSalesOrder, confirmSalesOrder],
  );

  const adjustInventory = useCallback(
    (
      productId: string,
      delta: number,
      note?: string,
    ): InventoryActionResult => {
      const result = adjustOnHand(
        productId,
        delta,
        products,
        stockMoves,
        currentUser.Role,
        note,
        stockReservations,
      );
      if (!result.ok || !result.products || !result.moves) return result;
      setProducts(result.products);
      setStockMoves(result.moves);
      if (result.reservations) setStockReservations(result.reservations);
      return result;
    },
    [products, stockMoves, stockReservations, currentUser.Role],
  );

  const prepareWeek10Lab = useCallback(() => {
    // 教學倉：P002/P011 歸零＋安全量；清空保留；維持其餘樣本
    const nextProducts = productsRef.current.map((p) => {
      if (p.Product_ID === "P002") {
        return { ...p, On_Hand: 0, Safety_Stock: 8, Hold_Allocation: false };
      }
      if (p.Product_ID === "P011") {
        return { ...p, On_Hand: 0, Safety_Stock: 3, Hold_Allocation: false };
      }
      return { ...p, Hold_Allocation: false };
    });
    productsRef.current = nextProducts;
    setProducts(nextProducts);
    stockReservationsRef.current = [];
    setStockReservations([]);
    shipmentsRef.current = [];
    setShipments([]);
    shipmentDetailsRef.current = [];
    setShipmentDetails([]);
    deliveryLogsRef.current = [];
    setDeliveryLogs([]);
    // 清掉與教學品相關草稿／舊異動，避免干擾期初
    const kept = stockMovesRef.current.filter(
      (m) => m.Product_ID !== "P002" && m.Product_ID !== "P011",
    );
    stockMovesRef.current = kept;
    setStockMoves(kept);
    return { ok: true, message: "已準備第 10 週教學庫存（P002/P011 現有＝0）。" };
  }, []);

  const createInventoryMove = useCallback(
    (input: Omit<CreateMoveInput, "role">): InventoryActionResult => {
      const result = createStockMove(
        { ...input, role: activeUser().Role },
        productsRef.current,
        stockMovesRef.current,
        stockReservationsRef.current,
      );
      if (result.products) {
        productsRef.current = result.products;
        setProducts(result.products);
      }
      if (result.moves) {
        stockMovesRef.current = result.moves;
        setStockMoves(result.moves);
      }
      if (result.reservations) {
        stockReservationsRef.current = result.reservations;
        setStockReservations(result.reservations);
      }
      return result;
    },
    [activeUser],
  );

  const postInventoryMove = useCallback(
    (moveId: string): InventoryActionResult => {
      const result = postStockMove(
        moveId,
        activeUser().Role,
        productsRef.current,
        stockMovesRef.current,
        stockReservationsRef.current,
      );
      if (result.products) {
        productsRef.current = result.products;
        setProducts(result.products);
      }
      if (result.moves) {
        stockMovesRef.current = result.moves;
        setStockMoves(result.moves);
      }
      if (result.reservations) {
        stockReservationsRef.current = result.reservations;
        setStockReservations(result.reservations);
      }
      return result;
    },
    [activeUser],
  );

  const setProductSafety = useCallback(
    (productId: string, safety: number): InventoryActionResult => {
      const result = setSafetyStock(
        productId,
        safety,
        productsRef.current,
        activeUser().Role,
      );
      if (result.products) {
        productsRef.current = result.products;
        setProducts(result.products);
      }
      return result;
    },
    [activeUser],
  );

  const inventorySnap = useCallback(
    (productId: string) =>
      getInventorySnapshot(
        productId,
        productsRef.current,
        stockMovesRef.current,
        stockReservationsRef.current,
      ),
    [],
  );

  /** 對外 setState 必須同步 ref，否則驗收／出貨讀到過期資料或漏擋盤點異常 */
  const setProductsSynced: Dispatch<SetStateAction<Product[]>> = useCallback(
    (action) => {
      setProducts((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        productsRef.current = next;
        return next;
      });
    },
    [],
  );
  const setStockMovesSynced: Dispatch<SetStateAction<StockMove[]>> =
    useCallback((action) => {
      setStockMoves((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        stockMovesRef.current = next;
        return next;
      });
    }, []);
  const setStockReservationsSynced: Dispatch<
    SetStateAction<StockReservation[]>
  > = useCallback((action) => {
    setStockReservations((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      stockReservationsRef.current = next;
      return next;
    });
  }, []);

  const recordArPayment = useCallback(
    (
      arId: string,
      amount: number | string,
      payDate: string,
      note?: string,
    ): ArActionResult => {
      const result = recordPayment(
        arId,
        amount,
        payDate,
        note,
        receivables,
        payments,
        currentUser.Role,
      );
      if (!result.ok || !result.receivables || !result.payments) return result;
      setReceivables(result.receivables);
      setPayments(result.payments);
      return result;
    },
    [receivables, payments, currentUser.Role],
  );

  const createCustomer = useCallback(
    (input: CustomerCreateInput): ActionResult => {
      const list = customersRef.current;
      const id = nextCustomerId(list);
      if (list.some((c) => c.Customer_ID === id)) {
        return {
          ok: false,
          message: `客戶編號 ${id} 已存在，無法建立。`,
          errors: { Customer_ID: `客戶編號 ${id} 已存在。` },
        };
      }
      const built = buildNewCustomer(id, input, activeUser().Role);
      if (!built.customer) {
        return { ok: false, message: built.message, errors: built.errors };
      }
      const duplicateHint = findDuplicateNameHint(
        list,
        built.customer.Customer_Name,
      );
      customersRef.current = [...list, built.customer];
      setCustomers(customersRef.current);
      return {
        ok: true,
        customer: built.customer,
        message: duplicateHint
          ? `已建立 ${built.customer.Customer_ID}。${duplicateHint}`
          : `已建立 ${built.customer.Customer_ID}`,
      };
    },
    [activeUser],
  );

  const updateCustomer = useCallback(
    (customerId: string, patch: CustomerUpdateInput): ActionResult => {
      const list = customersRef.current;
      const existing = list.find((c) => c.Customer_ID === customerId);
      if (!existing) return { ok: false, message: "找不到該客戶。" };
      const applied = applyCustomerPatch(existing, patch, activeUser().Role);
      if (!applied.customer) {
        return {
          ok: false,
          message: applied.message,
          errors: applied.errors,
        };
      }
      const duplicateHint = findDuplicateNameHint(
        list,
        applied.customer.Customer_Name,
        customerId,
      );
      customersRef.current = list.map((c) =>
        c.Customer_ID === customerId ? applied.customer! : c,
      );
      setCustomers(customersRef.current);
      return {
        ok: true,
        customer: applied.customer,
        message: duplicateHint ?? "已儲存客戶資料。",
      };
    },
    [activeUser],
  );

  const setCustomerActive = useCallback(
    (customerId: string, isActive: boolean): ActionResult =>
      updateCustomer(customerId, { Is_Active: isActive }),
    [updateCustomer],
  );

  const softDeleteCustomer = useCallback(
    (customerId: string): ActionResult => {
      const existing = customers.find((c) => c.Customer_ID === customerId);
      if (!existing) return { ok: false, message: "找不到該客戶。" };
      if (!existing.Is_Active) {
        return {
          ok: true,
          customer: existing,
          message: `${customerId} 已是停用狀態（軟刪除），無需再刪。`,
        };
      }
      return setCustomerActive(customerId, false);
    },
    [customers, setCustomerActive],
  );

  const tryForceCreditLimit = useCallback(
    (customerId: string, creditLimit: number): ActionResult =>
      updateCustomer(customerId, { Credit_Limit: creditLimit }),
    [updateCustomer],
  );

  const tryForceSoftDelete = useCallback(
    (customerId: string): ActionResult =>
      updateCustomer(customerId, { Is_Active: false }),
    [updateCustomer],
  );

  const createProduct = useCallback(
    (input: ProductCreateInput): ProductActionResult => {
      const list = productsRef.current;
      const id = nextProductId(list);
      const built = buildNewProduct(id, input, activeUser().Role);
      if (!built.product) {
        return { ok: false, message: built.message, errors: built.errors };
      }
      productsRef.current = [...list, built.product];
      setProducts(productsRef.current);
      return {
        ok: true,
        product: built.product,
        message: `已建立 ${built.product.Product_ID}`,
      };
    },
    [activeUser],
  );

  const updateProduct = useCallback(
    (productId: string, patch: ProductUpdateInput): ProductActionResult => {
      const list = productsRef.current;
      const existing = list.find((p) => p.Product_ID === productId);
      if (!existing) return { ok: false, message: "找不到該商品。" };
      const applied = applyProductPatch(existing, patch, activeUser().Role);
      if (!applied.product) {
        return {
          ok: false,
          message: applied.message,
          errors: applied.errors,
        };
      }
      productsRef.current = list.map((p) =>
        p.Product_ID === productId ? applied.product! : p,
      );
      setProducts(productsRef.current);
      return {
        ok: true,
        product: applied.product,
        message: "已儲存商品資料。",
      };
    },
    [activeUser],
  );

  const softDeactivateProduct = useCallback(
    (productId: string): ProductActionResult =>
      updateProduct(productId, { Is_Active: false }),
    [updateProduct],
  );

  const tryForceProductPrice = useCallback(
    (productId: string, listPrice: number): ProductActionResult =>
      updateProduct(productId, { List_Price: listPrice }),
    [updateProduct],
  );

  const createQuote = useCallback(
    (input: QuotationCreateInput): QuoteActionResult => {
      const id = nextQuoteId(quotationsRef.current);
      const result = buildQuotation(
        id,
        input,
        activeUser().Role,
        customersRef.current,
        productsRef.current,
      );
      if (!result.ok || !result.quotation || !result.details) return result;
      quotationsRef.current = [...quotationsRef.current, result.quotation];
      quotationDetailsRef.current = [
        ...quotationDetailsRef.current,
        ...result.details,
      ];
      setQuotations(quotationsRef.current);
      setQuotationDetails(quotationDetailsRef.current);
      return result;
    },
    [activeUser],
  );

  const updateDraftQuote = useCallback(
    (quoteId: string, input: QuotationUpdateInput): QuoteActionResult => {
      const existing = quotationsRef.current.find((q) => q.Quote_ID === quoteId);
      if (!existing) return { ok: false, message: "找不到該報價。" };
      const existingDetails = quotationDetailsRef.current.filter(
        (d) => d.Quote_ID === quoteId,
      );
      const result = updateDraftQuotation(
        existing,
        existingDetails,
        input,
        activeUser().Role,
        productsRef.current,
      );
      if (!result.ok || !result.quotation) return result;
      quotationsRef.current = quotationsRef.current.map((q) =>
        q.Quote_ID === quoteId ? result.quotation! : q,
      );
      setQuotations(quotationsRef.current);
      if (result.details) {
        quotationDetailsRef.current = [
          ...quotationDetailsRef.current.filter((d) => d.Quote_ID !== quoteId),
          ...result.details,
        ];
        setQuotationDetails(quotationDetailsRef.current);
      }
      return result;
    },
    [activeUser],
  );

  const setQuoteStatus = useCallback(
    (quoteId: string, status: QuoteStatus): QuoteActionResult => {
      const existing = quotationsRef.current.find((q) => q.Quote_ID === quoteId);
      if (!existing) return { ok: false, message: "找不到該報價。" };
      const result = transitionQuoteStatus(existing, status, activeUser().Role);
      if (!result.ok || !result.quotation) return result;
      quotationsRef.current = quotationsRef.current.map((q) =>
        q.Quote_ID === quoteId ? result.quotation! : q,
      );
      setQuotations(quotationsRef.current);
      return result;
    },
    [activeUser],
  );

  const tryForceAcceptQuote = useCallback(
    (quoteId: string): QuoteActionResult => setQuoteStatus(quoteId, "Accepted"),
    [setQuoteStatus],
  );

  const applySeedLike = useCallback(
    (next: Omit<PersistedState, "version">) => {
      usersRef.current = next.users;
      ordersRef.current = next.orders;
      orderDetailsRef.current = next.orderDetails;
      customersRef.current = next.customers;
      productsRef.current = next.products;
      quotationsRef.current = next.quotations;
      quotationDetailsRef.current = next.quotationDetails;
      stockMovesRef.current = next.stockMoves;
      stockReservationsRef.current = next.stockReservations ?? [];
      shipmentsRef.current = next.shipments ?? [];
      shipmentDetailsRef.current = next.shipmentDetails ?? [];
      deliveryLogsRef.current = next.deliveryLogs ?? [];
      receivablesRef.current = next.receivables;
      paymentsRef.current = next.payments;
      orderAuditsRef.current = next.orderAudits ?? [];
      currentUserIdRef.current = next.currentUserId;
      setUsers(next.users);
      setOrders(next.orders);
      setOrderDetails(next.orderDetails);
      setCustomers(next.customers);
      setProducts(next.products);
      setQuotations(next.quotations);
      setQuotationDetails(next.quotationDetails);
      setStockMoves(next.stockMoves);
      setStockReservations(next.stockReservations ?? []);
      setShipments(next.shipments ?? []);
      setShipmentDetails(next.shipmentDetails ?? []);
      setDeliveryLogs(next.deliveryLogs ?? []);
      setReceivables(next.receivables);
      setPayments(next.payments);
      setOrderAudits(next.orderAudits ?? []);
      setCurrentUserId(next.currentUserId);
      writeStorage({ version: STORAGE_VERSION, ...next });
      setSimLoadError(false);
      setLastSavedAt(Date.now());
    },
    [],
  );

  const clearOrders = useCallback(() => {
    setOrders([]);
    setOrderDetails([]);
  }, []);

  const resetDemoData = useCallback(() => {
    applySeedLike(cloneSeed());
  }, [applySeedLike]);

  /** 第 11 週起點＝第 10 週 I09 完成：SO-B 確認、P002 26/15/11、P011 8/1/7 */
  const prepareWeek11Lab = useCallback(() => {
    switchUser("U001");
    resetDemoData();
    prepareWeek10Lab();

    const openA = createInventoryMove({
      productId: "P002",
      moveType: "期初",
      qty: 20,
      asDraft: true,
      note: "W11 期初 P002",
      sourceDocId: "OP-W11-001",
    });
    const openB = createInventoryMove({
      productId: "P011",
      moveType: "期初",
      qty: 8,
      asDraft: true,
      note: "W11 期初 P011",
      sourceDocId: "OP-W11-002",
    });
    if (openA.moves?.length) {
      postInventoryMove(openA.moves[openA.moves.length - 1].Move_ID);
    }
    if (openB.moves?.length) {
      postInventoryMove(openB.moves[openB.moves.length - 1].Move_ID);
    }

    const soA = convertAcceptedQuote("QT-20261118-001", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const soB = convertAcceptedQuote("QT-20261118-002", {
      asOfDate: WEEK8_BUSINESS_DATE,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
    });
    const idA = soA.order?.Order_ID ?? "";
    const idB = soB.order?.Order_ID ?? "";
    saveDraftOrder(idA, {
      deliveryAgreed: true,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
      shipToName: "教學收貨人",
      shipToAddress: "台南市教學路 100 號",
    });
    saveDraftOrder(idB, {
      deliveryAgreed: true,
      requestedDate: "2026-11-23",
      promisedDate: "2026-11-23",
      shipToName: "教學收貨人",
      shipToAddress: "台南市教學路 100 號",
    });
    confirmSalesOrder(idA);
    createInventoryMove({
      productId: "P002",
      moveType: "入庫",
      qty: 10,
      asDraft: false,
      note: "補貨 10",
      sourceDocId: "IN-W11-001",
    });
    confirmSalesOrder(idB);
    cancelSalesOrder(idA, "第11週案例取消 SO-A");
    createInventoryMove({
      productId: "P002",
      moveType: "出庫",
      qty: 3,
      asDraft: false,
      note: "非銷售領用 3",
      sourceDocId: "OUT-W11-001",
    });
    createInventoryMove({
      productId: "P002",
      moveType: "盤點調整",
      qty: 0,
      countedQty: 26,
      asDraft: false,
      note: "實盤 26",
      reason: "盤點差異",
      sourceDocId: "ST-W11-001",
    });
    reopenSalesOrder(idB, "改量驗收");
    const dP002 = orderDetailsRef.current.find(
      (d) => d.Order_ID === idB && d.Product_ID === "P002",
    );
    if (dP002) {
      saveDraftOrder(idB, {
        qtyByDetailId: { [dP002.Detail_ID]: 15 },
        deliveryAgreed: true,
        requestedDate: "2026-11-23",
        promisedDate: "2026-11-23",
        shipToName: "教學收貨人",
        shipToAddress: "台南市教學路 100 號",
      });
    }
    confirmSalesOrder(idB);
    shipmentsRef.current = [];
    setShipments([]);
    shipmentDetailsRef.current = [];
    setShipmentDetails([]);
    deliveryLogsRef.current = [];
    setDeliveryLogs([]);
    return {
      ok: true,
      message: `第11週起點就緒：SO-B=${idB}（P002 26/15/11 · P011 8/1/7）`,
      orderId: idB,
    };
  }, [
    switchUser,
    resetDemoData,
    prepareWeek10Lab,
    createInventoryMove,
    postInventoryMove,
    convertAcceptedQuote,
    saveDraftOrder,
    confirmSalesOrder,
    cancelSalesOrder,
    reopenSalesOrder,
  ]);

  const loadBaselineData = useCallback(() => {
    const next = cloneSeed();
    next.customers = baselineCustomers.map((c) => ({ ...c }));
    // 與第 6 週基準一致：僅 SO001–SO005，避免 C006 幽靈訂單佔號
    next.orders = baselineOrders.map((o) => ensureOrderShape({ ...o }));
    next.orderDetails = baselineOrderDetails.map((d) => ensureDetailShape({ ...d }));
    applySeedLike(next);
  }, [applySeedLike]);

  const loadDemoData = useCallback(() => {
    const next = cloneSeed();
    next.customers = demoCustomers.map((c) => ({ ...c }));
    applySeedLike(next);
  }, [applySeedLike]);

  const exportDemoJson = useCallback(() => {
    const state: PersistedState = {
      version: STORAGE_VERSION,
      users,
      orders: ordersRef.current,
      orderDetails: orderDetailsRef.current,
      customers,
      products: productsRef.current,
      quotations,
      quotationDetails,
      stockMoves: stockMovesRef.current,
      stockReservations: stockReservationsRef.current,
      shipments: shipmentsRef.current,
      shipmentDetails: shipmentDetailsRef.current,
      deliveryLogs: deliveryLogsRef.current,
      receivables: receivablesRef.current,
      payments: paymentsRef.current,
      orderAudits: orderAuditsRef.current,
      currentUserId: currentUserIdRef.current,
    };
    return JSON.stringify(state, null, 2);
  }, [users, customers, quotations, quotationDetails]);

  const importDemoJson = useCallback(
    (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as { version?: number };
        if (parsed?.version === STORAGE_VERSION || parsed?.version === 7) {
          const full = parsed as PersistedState;
          const rest = { ...full };
          delete (rest as { version?: number }).version;
          if (!Array.isArray(rest.stockReservations)) {
            rest.stockReservations = [];
          }
          if (!Array.isArray(rest.shipments)) rest.shipments = [];
          if (!Array.isArray(rest.shipmentDetails)) rest.shipmentDetails = [];
          if (!Array.isArray(rest.deliveryLogs)) rest.deliveryLogs = [];
          applySeedLike(rest as Omit<PersistedState, "version">);
          return {
            ok: true,
            message: `已匯入 ${full.orders.length} 張訂單、${(full.shipments ?? []).length} 張出貨、${(full.stockReservations ?? []).length} 筆保留。`,
          };
        }
        const migrated = migrateFromLegacy(
          parsed as Parameters<typeof migrateFromLegacy>[0],
        );
        if (!migrated) {
          return {
            ok: false,
            message: "無法匯入：請使用本系統匯出的 v8／v7 JSON。",
          };
        }
        const rest = { ...migrated };
        delete (rest as { version?: number }).version;
        applySeedLike(rest as Omit<PersistedState, "version">);
        return {
          ok: true,
          message: `已匯入 ${migrated.orders.length} 張訂單、${migrated.quotations.length} 張報價。`,
        };
      } catch {
        return { ok: false, message: "無法匯入：JSON 格式錯誤。" };
      }
    },
    [applySeedLike],
  );

  const value: AppContextValue = {
    currentUserId,
    currentUser,
    users,
    orders,
    customers,
    products,
    quotations,
    quotationDetails,
    orderDetails,
    stockMoves,
    stockReservations,
    shipments,
    shipmentDetails,
    deliveryLogs,
    setProducts: setProductsSynced,
    setStockMoves: setStockMovesSynced,
    setStockReservations: setStockReservationsSynced,
    receivables,
    payments,
    orderAudits,
    kpi,
    hydrated,
    persistLabel,
    lastSavedAt,
    switchUser,
    setUserActive,
    setOrderStatus,
    convertAcceptedQuote,
    saveDraftOrder,
    confirmSalesOrder,
    cancelSalesOrder,
    reopenSalesOrder,
    shipConfirmedOrder,
    unshipOrder,
    createShipmentFromOrder,
    saveShipmentDraft,
    postShipmentDoc,
    updateShipmentDelivery,
    adjustInventory,
    prepareWeek10Lab,
    prepareWeek11Lab,
    createInventoryMove,
    postInventoryMove,
    setProductSafety,
    inventorySnap,
    recordArPayment,
    createCustomer,
    updateCustomer,
    setCustomerActive,
    softDeleteCustomer,
    tryForceCreditLimit,
    tryForceSoftDelete,
    createProduct,
    updateProduct,
    softDeactivateProduct,
    tryForceProductPrice,
    createQuote,
    updateDraftQuote,
    setQuoteStatus,
    tryForceAcceptQuote,
    resetDemoData,
    loadBaselineData,
    loadDemoData,
    exportDemoJson,
    importDemoJson,
    clearOrders,
    simLoadError,
    setSimLoadError,
    canAccessSettings,
    customerName,
    productName,
    peekNextCustomerId,
    peekNextProductId,
    peekNextQuoteId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
