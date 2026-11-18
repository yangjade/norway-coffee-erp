"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";
import { Notice, PageHeader } from "@/components/Notice";
import { useApp } from "@/lib/app-context";

export default function EditProductPage() {
  const params = useParams();
  const productId = String(params.productId ?? "");
  const { products } = useApp();
  const product = products.find((p) => p.Product_ID === productId);

  if (!product) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="商品不存在" description={productId} />
        <Notice kind="empty">找不到此商品。</Notice>
        <Link href="/products/" className="text-sm text-[var(--brand)] underline">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title={`編輯 ${product.Product_ID}`}
        description="Staff 僅名稱／說明；Admin 可改 List_Price／Cost／啟停"
        actions={
          <Link
            href={`/products/${product.Product_ID}/`}
            className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
          >
            返回詳細
          </Link>
        }
      />
      <div className="surface-panel border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <ProductForm mode="edit" initial={product} />
      </div>
    </div>
  );
}
