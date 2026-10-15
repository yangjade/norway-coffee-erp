"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  customers as seedCustomers,
  initialOrders,
  initialUsers,
  orderDetails,
  products as seedProducts,
} from "./sample-data";
import { computeKpi } from "./kpi";
import type {
  AppUser,
  Customer,
  OrderStatus,
  Product,
  SalesOrder,
} from "./types";

const STORAGE_KEY = "norway-coffee-erp-demo-v1";
const STORAGE_VERSION = 1 as const;

interface PersistedState {
  version: typeof STORAGE_VERSION;
  users: AppUser[];
  orders: SalesOrder[];
  customers: Customer[];
  products: Product[];
  currentUserId: string;
}

interface AppContextValue {
  currentUserId: string;
  currentUser: AppUser;
  users: AppUser[];
  orders: SalesOrder[];
  customers: Customer[];
  products: Product[];
  orderDetails: typeof orderDetails;
  kpi: ReturnType<typeof computeKpi>;
  hydrated: boolean;
  persistLabel: string;
  lastSavedAt: number | null;
  switchUser: (userId: string) => { ok: boolean; message?: string };
  setUserActive: (
    userId: string,
    isActive: boolean,
  ) => { ok: boolean; message?: string };
  setOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateCustomer: (
    customerId: string,
    patch: Partial<Pick<Customer, "Contact" | "Status">>,
  ) => { ok: boolean; message?: string };
  updateProduct: (
    productId: string,
    patch: Partial<Pick<Product, "Unit_Price" | "Status">>,
  ) => { ok: boolean; message?: string };
  resetDemoData: () => void;
  clearOrders: () => void;
  simLoadError: boolean;
  setSimLoadError: (v: boolean) => void;
  canAccessSettings: boolean;
  customerName: (id: string) => string;
  productName: (id: string) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

function cloneSeed(): Omit<PersistedState, "version"> {
  return {
    users: initialUsers.map((u) => ({ ...u })),
    orders: initialOrders.map((o) => ({ ...o })),
    customers: seedCustomers.map((c) => ({ ...c })),
    products: seedProducts.map((p) => ({ ...p })),
    currentUserId: "U001",
  };
}

function readStorage(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed?.version !== STORAGE_VERSION) return null;
    if (
      !Array.isArray(parsed.users) ||
      !Array.isArray(parsed.orders) ||
      !Array.isArray(parsed.customers) ||
      !Array.isArray(parsed.products) ||
      typeof parsed.currentUserId !== "string"
    ) {
      return null;
    }
    return parsed;
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
  const [customers, setCustomers] = useState<Customer[]>(seed.customers);
  const [products, setProducts] = useState<Product[]>(seed.products);
  const [currentUserId, setCurrentUserId] = useState(seed.currentUserId);
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [simLoadError, setSimLoadError] = useState(false);

  // 首次載入：還原本機資料
  useEffect(() => {
    const stored = readStorage();
    if (stored) {
      setUsers(stored.users.map((u) => ({ ...u })));
      setOrders(stored.orders.map((o) => ({ ...o })));
      setCustomers(stored.customers.map((c) => ({ ...c })));
      setProducts(stored.products.map((p) => ({ ...p })));
      const active =
        stored.users.find((u) => u.User_ID === stored.currentUserId)?.Is_Active !==
        false
          ? stored.currentUserId
          : "U001";
      setCurrentUserId(active);
      setLastSavedAt(Date.now());
    } else {
      writeStorage({ version: STORAGE_VERSION, ...cloneSeed() });
      setLastSavedAt(Date.now());
    }
    setHydrated(true);
  }, []);

  // 變更後寫入 localStorage（單一來源同步）
  useEffect(() => {
    if (!hydrated) return;
    writeStorage({
      version: STORAGE_VERSION,
      users,
      orders,
      customers,
      products,
      currentUserId,
    });
    setLastSavedAt(Date.now());
  }, [hydrated, users, orders, customers, products, currentUserId]);

  // 同瀏覽器其他分頁變更時同步
  useEffect(() => {
    if (!hydrated) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as PersistedState;
        if (parsed?.version !== STORAGE_VERSION) return;
        setUsers(parsed.users.map((u) => ({ ...u })));
        setOrders(parsed.orders.map((o) => ({ ...o })));
        setCustomers(parsed.customers.map((c) => ({ ...c })));
        setProducts(parsed.products.map((p) => ({ ...p })));
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

  const persistLabel = hydrated
    ? "資料已同步 · 已儲存於本機"
    : "載入本機資料中…";

  const switchUser = useCallback(
    (userId: string) => {
      const target = users.find((u) => u.User_ID === userId);
      if (!target) {
        return { ok: false, message: "找不到該使用者。" };
      }
      if (!target.Is_Active) {
        return {
          ok: false,
          message: `${target.User_ID} 已停用，無法切換為此使用者。`,
        };
      }
      setCurrentUserId(userId);
      if (target.Role !== "Admin") {
        router.push("/");
      }
      return { ok: true };
    },
    [users, router],
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

  /** Admin 與 Staff 皆可改訂單狀態（方便驗證 KPI 同步） */
  const setOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.Order_ID === orderId ? { ...o, Order_Status: status } : o,
      ),
    );
  }, []);

  const updateCustomer = useCallback(
    (
      customerId: string,
      patch: Partial<Pick<Customer, "Contact" | "Status">>,
    ) => {
      if (currentUser.Role !== "Admin") {
        return {
          ok: false,
          message: "目前角色無法修改客戶資料（僅系統管理者）。",
        };
      }
      setCustomers((prev) =>
        prev.map((c) =>
          c.Customer_ID === customerId ? { ...c, ...patch } : c,
        ),
      );
      return { ok: true };
    },
    [currentUser.Role],
  );

  const updateProduct = useCallback(
    (
      productId: string,
      patch: Partial<Pick<Product, "Unit_Price" | "Status">>,
    ) => {
      if (currentUser.Role !== "Admin") {
        return {
          ok: false,
          message: "目前角色無法修改商品資料（僅系統管理者）。",
        };
      }
      setProducts((prev) =>
        prev.map((p) =>
          p.Product_ID === productId ? { ...p, ...patch } : p,
        ),
      );
      return { ok: true };
    },
    [currentUser.Role],
  );

  const clearOrders = useCallback(() => {
    setOrders([]);
  }, []);

  const resetDemoData = useCallback(() => {
    const next = cloneSeed();
    setUsers(next.users);
    setOrders(next.orders);
    setCustomers(next.customers);
    setProducts(next.products);
    setCurrentUserId(next.currentUserId);
    writeStorage({ version: STORAGE_VERSION, ...next });
    setSimLoadError(false);
    setLastSavedAt(Date.now());
  }, []);

  const value: AppContextValue = {
    currentUserId,
    currentUser,
    users,
    orders,
    customers,
    products,
    orderDetails,
    kpi,
    hydrated,
    persistLabel,
    lastSavedAt,
    switchUser,
    setUserActive,
    setOrderStatus,
    updateCustomer,
    updateProduct,
    resetDemoData,
    clearOrders,
    simLoadError,
    setSimLoadError,
    canAccessSettings,
    customerName,
    productName,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
