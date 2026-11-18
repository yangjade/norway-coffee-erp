"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CustomerForm } from "@/components/CustomerForm";
import { Notice, PageHeader } from "@/components/Notice";
import { useApp } from "@/lib/app-context";

export default function EditCustomerPage() {
  const params = useParams();
  const customerId = String(params.customerId ?? "");
  const { customers, hydrated } = useApp();
  const customer = customers.find((c) => c.Customer_ID === customerId);

  if (!hydrated) {
    return (
      <div className="space-y-5 animate-rise">
        <PageHeader title="編輯客戶" />
        <Notice kind="info">載入本機客戶資料中…</Notice>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-5 animate-rise">
        <PageHeader title="編輯客戶" description={customerId} />
        <Notice kind="empty" title="找不到客戶" showHomeLink>
          無法編輯不存在的客戶。
          <div className="mt-3">
            <Link
              href="/customers/"
              className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
            >
              返回客戶列表
            </Link>
          </div>
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title={`編輯 ${customer.Customer_Name}`}
        description={`${customer.Customer_ID} · Customer_ID 不可修改 · 無實體刪除`}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/customers/${customer.Customer_ID}/`}
              className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
            >
              返回詳細
            </Link>
            <Link
              href="/customers/"
              className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
            >
              返回列表
            </Link>
          </div>
        }
      />
      <div className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <CustomerForm mode="edit" initial={customer} />
      </div>
    </div>
  );
}
