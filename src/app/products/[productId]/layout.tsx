import { productStaticIds } from "@/lib/product-static-ids";

export function generateStaticParams() {
  return productStaticIds().map((productId) => ({ productId }));
}

export default function ProductIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
