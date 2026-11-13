import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  待確認: "text-[var(--wood)] bg-[var(--accent-soft)]",
  處理中: "text-[var(--brand-deep)] bg-[var(--brand-soft)]",
  已出貨: "text-[var(--brand-deep)] bg-[var(--mist-blue)]",
  已取消: "text-[var(--muted)] bg-[var(--linen)]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.03em] ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
