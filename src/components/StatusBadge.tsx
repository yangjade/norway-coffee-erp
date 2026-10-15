import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  待確認: "text-[#8a6a1f] bg-[var(--accent-soft)]",
  處理中: "text-[var(--brand)] bg-[var(--brand-soft)]",
  已出貨: "text-[var(--brand-deep)] bg-[#d9e5dc]",
  已取消: "text-[var(--muted)] bg-[var(--linen)]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[11px] font-medium tracking-[0.04em] ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
