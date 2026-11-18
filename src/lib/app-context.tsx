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
import type {
  AppUser,
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
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
  StockMove,
  StockReservation,
} from "./types";

const STORAGE_KEY = "norway-coffee-erp-demo-v7";
const STORAGE_VERSION = 7 as const;

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
    parsed?.version !== 6
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
    stockReservations: Array.isArray(
      (parsed as { stockReservations?: unknown }).stockReservations,
    )
      ? (
          (parsed as { stockReservations: StockReservation[] })
            .stockReservations as StockReservation[]
        ).map((r) => ({ ...r }))
      : [],
    receivables,
    payments,
    orderAudits: Array.isArray((parsed as { orderAudits?: unknown }).orderAudits)
      ? ((parsed as { orderAudits: OrderAuditEntry[] }).orderAudits as OrderAuditEntry[])
      : [],
    currentUserId: parsed.currentUserId,
  };
}

function readStorage(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem("norway-coffee-erp-demo-v5") ??
      window.localStorage.getItem("norway-coffee-erp-demo-v4");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; orders?: unknown[] };
    // v7＝第 10 週庫存保留；舊版強制重載完整種子
    if (parsed?.version !== 7) {
      return null;
    }
    return migrateFromLegacy(parsed);
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
  const productsRef = useRef(products);
  const receivablesRef = useRef(receivables);
  const paymentsRef = useRef(payments);
  const stockMovesRef = useRef(stockMoves);
  const stockReservationsRef = useRef(stockReservations);
  const usersRef = useRef(users);
  const currentUserIdRef = useRef(currentUserId);
  ordersRef.current = orders;
  orderDetailsRef.current = orderDetails;
  orderAuditsRef.current = orderAudits;
  productsRef.current = products;
  receivablesRef.current = receivables;
  paymentsRef.current = payments;
  stockMovesRef.current = stockMoves;
  stockReservationsRef.current = stockReservations;
  usersRef.current = users;
  currentUserIdRef.current = currentUserId;
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [simLoadError, setSimLoadError] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.removeItem("norway-coffee-erp-demo-v1");
    } catch {
      /* ignore */
    }
    const stored = readStorage();
    if (stored) {
      setUsers(stored.users.map((u) => ({ ...u })));
      setOrders(stored.orders.map((o) => ({ ...o })));
      setOrderDetails(stored.orderDetails.map((d) => ({ ...d })));
      setCustomers(stored.customers.map((c) => ({ ...c })));
      setProducts(stored.products.map((p) => ({ ...p })));
      const scanned = applyExpiryScan(
        stored.quotations.map((q) => ({ ...q })),
        todayLocalDate(),
      );
      setQuotations(scanned.quotations);
      setQuotationDetails(stored.quotationDetails.map((d) => ({ ...d })));
      setStockMoves(stored.stockMoves.map((m) => ({ ...m })));
      setStockReservations(
        (stored.stockReservations ?? []).map((r) => ({ ...r })),
      );
      setReceivables(stored.receivables.map((r) => ({ ...r })));
      setPayments(stored.payments.map((p) => ({ ...p })));
      setOrderAudits((stored.orderAudits ?? []).map((a) => ({ ...a })));
      const active =
        stored.users.find((u) => u.User_ID === stored.currentUserId)
          ?.Is_Active !== false
          ? stored.currentUserId
          : "U001";
      setCurrentUserId(active);
      setLastSavedAt(Date.now());
    } else {
      const seedData = cloneSeed();
      const scanned = applyExpiryScan(seedData.quotations, todayLocalDate());
      seedData.quotations = scanned.quotations;
      setQuotations(scanned.quotations);
      writeStorage({ version: STORAGE_VERSION, ...seedData });
      setLastSavedAt(Date.now());
    }
    setHydrated(true);
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
      if (target.Role !== "Admin") router.push("/");
      return { ok: true };
    },
    [router],
  );

  const setUserActive = useCallback(
    (userId: string, isActive: boolean) => {
      if (currentUser.Role !== "Admin") {
        return {
          ok: false,
          message: "目前角色無法使用此功能（無權限修改使用者啟用狀態）。",
        };
      }
      if (userId !== "U002") {
        return { ok: false, message: "本週教學僅允許修改 U002 的啟用狀態。" };
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.User_ID === userId ? { ...u, Is_Active: isActive } : u,
        ),
      );
      return { ok: true };
    },
    [currentUser.Role],
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
      const id = nextCustomerId(customers);
      if (customers.some((c) => c.Customer_ID === id)) {
        return {
          ok: false,
          message: `客戶編號 ${id} 已存在，無法建立。`,
          errors: { Customer_ID: `客戶編號 ${id} 已存在。` },
        };
      }
      const built = buildNewCustomer(id, input, currentUser.Role);
      if (!built.customer) {
        return { ok: false, message: built.message, errors: built.errors };
      }
      const duplicateHint = findDuplicateNameHint(
        customers,
        built.customer.Customer_Name,
      );
      setCustomers((prev) => [...prev, built.customer!]);
      return {
        ok: true,
        customer: built.customer,
        message: duplicateHint
          ? `已建立 ${built.customer.Customer_ID}。${duplicateHint}`
          : `已建立 ${built.customer.Customer_ID}`,
      };
    },
    [customers, currentUser.Role],
  );

  const updateCustomer = useCallback(
    (customerId: string, patch: CustomerUpdateInput): ActionResult => {
      const existing = customers.find((c) => c.Customer_ID === customerId);
      if (!existing) return { ok: false, message: "找不到該客戶。" };
      const applied = applyCustomerPatch(existing, patch, currentUser.Role);
      if (!applied.customer) {
        return {
          ok: false,
          message: applied.message,
          errors: applied.errors,
        };
      }
      const duplicateHint = findDuplicateNameHint(
        customers,
        applied.customer.Customer_Name,
        customerId,
      );
      setCustomers((prev) =>
        prev.map((c) =>
          c.Customer_ID === customerId ? applied.customer! : c,
        ),
      );
      return {
        ok: true,
        customer: applied.customer,
        message: duplicateHint ?? "已儲存客戶資料。",
      };
    },
    [customers, currentUser.Role],
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
      const id = nextProductId(products);
      const built = buildNewProduct(id, input, currentUser.Role);
      if (!built.product) {
        return { ok: false, message: built.message, errors: built.errors };
      }
      setProducts((prev) => [...prev, built.product!]);
      return {
        ok: true,
        product: built.product,
        message: `已建立 ${built.product.Product_ID}`,
      };
    },
    [products, currentUser.Role],
  );

  const updateProduct = useCallback(
    (productId: string, patch: ProductUpdateInput): ProductActionResult => {
      const existing = products.find((p) => p.Product_ID === productId);
      if (!existing) return { ok: false, message: "找不到該商品。" };
      const applied = applyProductPatch(existing, patch, currentUser.Role);
      if (!applied.product) {
        return {
          ok: false,
          message: applied.message,
          errors: applied.errors,
        };
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.Product_ID === productId ? applied.product! : p,
        ),
      );
      return {
        ok: true,
        product: applied.product,
        message: "已儲存商品資料。",
      };
    },
    [products, currentUser.Role],
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
      const id = nextQuoteId(quotations);
      const result = buildQuotation(
        id,
        input,
        currentUser.Role,
        customers,
        products,
      );
      if (!result.ok || !result.quotation || !result.details) return result;
      setQuotations((prev) => [...prev, result.quotation!]);
      setQuotationDetails((prev) => [...prev, ...result.details!]);
      return result;
    },
    [quotations, customers, products, currentUser.Role],
  );

  const updateDraftQuote = useCallback(
    (quoteId: string, input: QuotationUpdateInput): QuoteActionResult => {
      const existing = quotations.find((q) => q.Quote_ID === quoteId);
      if (!existing) return { ok: false, message: "找不到該報價。" };
      const existingDetails = quotationDetails.filter(
        (d) => d.Quote_ID === quoteId,
      );
      const result = updateDraftQuotation(
        existing,
        existingDetails,
        input,
        currentUser.Role,
        products,
      );
      if (!result.ok || !result.quotation) return result;
      setQuotations((prev) =>
        prev.map((q) => (q.Quote_ID === quoteId ? result.quotation! : q)),
      );
      if (result.details) {
        setQuotationDetails((prev) => [
          ...prev.filter((d) => d.Quote_ID !== quoteId),
          ...result.details!,
        ]);
      }
      return result;
    },
    [quotations, quotationDetails, products, currentUser.Role],
  );

  const setQuoteStatus = useCallback(
    (quoteId: string, status: QuoteStatus): QuoteActionResult => {
      const existing = quotations.find((q) => q.Quote_ID === quoteId);
      if (!existing) return { ok: false, message: "找不到該報價。" };
      const result = transitionQuoteStatus(existing, status, currentUser.Role);
      if (!result.ok || !result.quotation) return result;
      setQuotations((prev) =>
        prev.map((q) => (q.Quote_ID === quoteId ? result.quotation! : q)),
      );
      return result;
    },
    [quotations, currentUser.Role],
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
      productsRef.current = next.products;
      stockMovesRef.current = next.stockMoves;
      stockReservationsRef.current = next.stockReservations ?? [];
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

  const loadBaselineData = useCallback(() => {
    const next = cloneSeed();
    next.customers = baselineCustomers.map((c) => ({ ...c }));
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
        // v7 直接套用；舊版走 migrate
        if (parsed?.version === STORAGE_VERSION) {
          const full = parsed as PersistedState;
          const rest = { ...full };
          delete (rest as { version?: number }).version;
          if (!Array.isArray(rest.stockReservations)) {
            rest.stockReservations = [];
          }
          applySeedLike(rest as Omit<PersistedState, "version">);
          return {
            ok: true,
            message: `已匯入 ${full.orders.length} 張訂單、${full.quotations.length} 張報價、${(full.stockReservations ?? []).length} 筆保留。`,
          };
        }
        const migrated = migrateFromLegacy(
          parsed as Parameters<typeof migrateFromLegacy>[0],
        );
        if (!migrated) {
          return {
            ok: false,
            message: "無法匯入：請使用本系統匯出的 v7 JSON。",
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
    setProducts,
    setStockMoves,
    setStockReservations,
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
    adjustInventory,
    prepareWeek10Lab,
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
