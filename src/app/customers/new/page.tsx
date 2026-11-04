"use client";

import Link from "next/link";
import { CustomerForm } from "@/components/CustomerForm";
import { PageHeader } from "@/components/Notice";

export default function NewCustomerPage() {
  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="新增客戶"
        description="必填客戶名稱；編號自動產生（最大流水號 +1）。預設：零售／現結／額度 0／啟用。"
        actions={
          <Link
            href="/customers/"
            className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
          >
            返回列表
          </Link>
        }
      />
      <div className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <CustomerForm mode="create" />
      </div>
    </div>
  );
}
