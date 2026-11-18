import OrderDetailClient from "@/components/OrderDetailClient";
import { orderStaticIds } from "@/lib/order-static-ids";

export function generateStaticParams() {
  return orderStaticIds().map((orderId) => ({ orderId }));
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}
