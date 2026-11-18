"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  DESC_MAX,
  PRODUCT_CATEGORIES,
  type ProductFieldErrors,
} from "@/lib/product-rules";
import type { Product } from "@/lib/types";

export function ProductForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: Product;
}) {
  const router = useRouter();
  const { createProduct, updateProduct, currentUser, peekNextProductId } =
    useApp();
  const isAdmin = currentUser.Role === "Admin";

  const [name, setName] = useState(initial?.Product_Name ?? "");
  const [category, setCategory] = useState(
    initial?.Category ?? PRODUCT_CATEGORIES[0],
  );
  const [unit, setUnit] = useState(initial?.Unit ?? "包");
  const [listPrice, setListPrice] = useState(
    String(initial?.List_Price ?? 0),
  );
  const [cost, setCost] = useState(String(initial?.Cost ?? 0));
  const [isActive, setIsActive] = useState(initial?.Is_Active ?? true);
  const [description, setDescription] = useState(initial?.Description ?? "");
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [msg, setMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (mode === "create") {
      const result = createProduct({
        Product_Name: name,
        Category: category,
        Unit: unit,
        Description: description,
        ...(isAdmin
          ? {
              List_Price: listPrice,
              Cost: cost,
              Is_Active: isActive,
            }
          : {}),
      });
      if (!result.ok) {
        setErrors(result.errors ?? {});
        setMsg(result.message ?? "建立失敗");
        return;
      }
      router.push(`/products/${result.product!.Product_ID}/`);
      return;
    }
    const result = updateProduct(initial!.Product_ID, {
      Product_Name: name,
      Description: description,
      Category: category,
      Unit: unit,
      ...(isAdmin
        ? {
            List_Price: listPrice,
            Cost: cost,
            Is_Active: isActive,
          }
        : {}),
    });
    if (!result.ok) {
      setErrors(result.errors ?? {});
      setMsg(result.message ?? "儲存失敗");
      return;
    }
    router.push(`/products/${initial!.Product_ID}/`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 animate-rise">
      {mode === "create" && (
        <p className="text-xs text-[var(--muted)]">
          下一編號預覽：
          <span className="ml-1 font-mono text-[var(--brand)]">
            {peekNextProductId()}
          </span>
          {!isAdmin && " · Staff 新增後 List_Price／Cost 預設 0，請管理員定價"}
        </p>
      )}

      <Field label="商品名稱" required error={errors.Product_Name}>
        <input
          className="field w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="分類" required error={errors.Category}>
          <select
            className="field w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={mode === "edit" && !isAdmin}
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="單位" required error={errors.Unit}>
          <input
            className="field w-full"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={mode === "edit" && !isAdmin}
          />
        </Field>
      </div>

      <Field
        label={`說明（≤${DESC_MAX}）`}
        error={errors.Description}
      >
        <textarea
          className="field w-full min-h-[4.5rem]"
          maxLength={DESC_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      {isAdmin ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="List_Price（元）" required error={errors.List_Price}>
            <input
              className="field w-full tabular-nums"
              type="number"
              min={0}
              step={1}
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
            />
          </Field>
          <Field label="Cost（元）" required error={errors.Cost}>
            <input
              className="field w-full tabular-nums"
              type="number"
              min={0}
              step={1}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </Field>
          <Field label="啟用">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {isActive ? "啟用" : "停用"}
            </label>
          </Field>
        </div>
      ) : (
        <p className="border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3 py-2 text-xs text-[var(--brand-deep)]">
          Staff 僅可維護名稱／說明
          {mode === "create" ? "（及新增時分類／單位）" : ""}
          ；List_Price、Cost、啟停僅管理者可改。
        </p>
      )}

      {msg && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {msg}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" className="btn-primary">
          {mode === "create" ? "建立商品" : "儲存變更"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() =>
            router.push(
              mode === "edit" && initial
                ? `/products/${initial.Product_ID}/`
                : "/products/",
            )
          }
        >
          取消
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--muted)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error && (
        <span className="block text-xs text-[var(--danger)]">{error}</span>
      )}
    </label>
  );
}
