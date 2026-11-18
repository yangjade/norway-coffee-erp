import { statusLabelZh } from "@/lib/order-rules";
import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  Draft: "text-[var(--wood)] bg-[var(--accent-soft)]",
  Confirmed: "text-[var(--brand-deep)] bg-[var(--brand-soft)]",
  Cancelled: "text-[var(--muted)] bg-[var(--linen)]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.03em] ${STYLES[status] ?? ""}`}
    >
      {statusLabelZh(status)}
    </span>
  );
}

/** 草稿 → 已確認；已取消單獨標示 */
export function OrderStatusProgress({ status }: { status: OrderStatus }) {
  const steps: { key: OrderStatus; label: string }[] = [
    { key: "Draft", label: "草稿" },
    { key: "Confirmed", label: "已確認" },
    { key: "Cancelled", label: "已取消" },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label={`訂單狀態：${statusLabelZh(status)}`}
    >
      {steps.map((s, i) => {
        const active = s.key === status;
        const lit =
          active ||
          (status === "Confirmed" && (s.key === "Draft" || s.key === "Confirmed"));
        const connectorOn =
          (status === "Confirmed" && i > 0 && i <= 1) ||
          (status === "Cancelled" && i === 2) ||
          (status === "Draft" && false);
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            {i > 0 && (
              <span
                className={`h-px w-4 sm:w-6 ${
                  connectorOn || lit ? "bg-[var(--brand)]" : "bg-[var(--border)]"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                active
                  ? STYLES[s.key] + " ring-1 ring-[var(--brand)]/30"
                  : lit
                    ? "bg-[var(--brand-soft)]/60 text-[var(--brand-deep)]"
                    : "bg-[var(--linen)] text-[var(--muted)]"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  active || lit ? "bg-[var(--brand)]" : "bg-[var(--border)]"
                }`}
              />
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
