"use client";

import Link from "next/link";
import { ProductForm } from "@/components/ProductForm";
import { PageHeader } from "@/components/Notice";

export default function NewProductPage() {
  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="新增商品"
        description="Admin 可定 List_Price／Cost；Staff 可新增，預設牌價 0 待管理者定價。"
        actions={
          <Link
            href="/products/"
            className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
          >
            返回列表
          </Link>
        }
      />
      <div className="surface-panel border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
