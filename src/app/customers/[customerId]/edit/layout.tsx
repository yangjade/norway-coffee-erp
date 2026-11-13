import { customerStaticIds } from "@/lib/customer-static-ids";

export function generateStaticParams() {
  return customerStaticIds().map((customerId) => ({ customerId }));
}

export default function EditCustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
