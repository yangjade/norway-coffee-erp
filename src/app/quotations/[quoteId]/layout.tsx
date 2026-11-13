import { quoteStaticIds } from "@/lib/product-static-ids";

export function generateStaticParams() {
  return quoteStaticIds().map((quoteId) => ({ quoteId }));
}

export default function QuoteIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
