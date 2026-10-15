import OrderDetailClient from "@/components/OrderDetailClient";
import { initialOrders } from "@/lib/sample-data";

export function generateStaticParams() {
  return initialOrders.map((o) => ({ orderId: o.Order_ID }));
}

export default function OrderDetailPage() {
  return <OrderDetailClient />;
}
