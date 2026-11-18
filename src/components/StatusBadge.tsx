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
