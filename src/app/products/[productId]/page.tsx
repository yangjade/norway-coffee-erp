"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useApp } from "@/lib/app-context";
import { formatTwd } from "@/lib/format";
import { activeProductLabel } from "@/lib/product-rules";
import { Notice, PageHeader } from "@/components/Notice";

export default function ProductDetailPage() {
  const params = useParams();
  const productId = String(params.productId ?? "");
  const { products, currentUser } = useApp();
  const product = products.find((p) => p.Product_ID === productId);
  const isAdmin = currentUser.Role === "Admin";

  if (!product) {
    return (
      <div className="space-y-4 animate-rise">
        <PageHeader title="商品不存在" description={productId} />
        <Notice kind="empty">找不到此商品編號。</Notice>
        <Link href="/products/" className="text-sm text-[var(--brand)] underline">
          返回商品列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title={product.Product_Name}
        description={`${product.Product_ID} · ${product.Category} · ${activeProductLabel(product.Is_Active)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products/"
              className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
            >
              列表
            </Link>
            <Link
              href={`/products/${product.Product_ID}/edit/`}
              className="btn-primary"
            >
              編輯
            </Link>
          </div>
        }
      />

      {!product.Is_Active && (
        <Notice kind="info">此商品已停用，不可加入新報價；歷史報價仍保留。</Notice>
      )}

      <div className="surface-panel grid gap-3 border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 sm:p-5">
        <Item label="Product_ID" value={product.Product_ID} mono />
        <Item label="分類" value={product.Category} />
        <Item label="單位" value={product.Unit} />
        <Item label="On_Hand 現有量" value={String(product.On_Hand)} />
        <Item
          label="List_Price"
          value={`NT$ ${formatTwd(product.List_Price)}`}
        />
        <Item
          label="Cost"
          value={isAdmin ? `NT$ ${formatTwd(product.Cost)}` : "（僅管理者可見）"}
        />
        <Item label="啟用" value={activeProductLabel(product.Is_Active)} />
        <div className="sm:col-span-2">
          <Link
            href="/inventory/"
            className="text-xs text-[var(--brand)] underline-offset-2 hover:underline"
          >
            前往庫存模組調整／查看異動
          </Link>
        </div>
        <div className="sm:col-span-2">
          <Item
            label="說明"
            value={product.Description || "—"}
          />
        </div>
      </div>
    </div>
  );
}

function Item({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] tracking-wide text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 text-sm text-[var(--brand-deep)] ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
