"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  tone: ToastTone;
  title?: string;
  message: string;
};

type ToastContextValue = {
  pushToast: (input: {
    tone?: ToastTone;
    title?: string;
    message: string;
    ms?: number;
  }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (input: {
      tone?: ToastTone;
      title?: string;
      message: string;
      ms?: number;
    }) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const tone = input.tone ?? "info";
      setItems((prev) => [
        ...prev.slice(-4),
        { id, tone, title: input.title, message: input.message },
      ]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, input.ms ?? 3200);
    },
    [],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-stack no-print"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast-item toast-${t.tone}`}
            role={t.tone === "error" ? "alert" : "status"}
          >
            {t.title && <p className="toast-title">{t.title}</p>}
            <p className="toast-msg">{t.message}</p>
            <button
              type="button"
              className="toast-close"
              aria-label="關閉通知"
              onClick={() =>
                setItems((prev) => prev.filter((x) => x.id !== t.id))
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      pushToast: () => {
        /* no-op outside provider */
      },
    };
  }
  return ctx;
}
