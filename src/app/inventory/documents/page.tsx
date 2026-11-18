"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Notice, PageHeader } from "@/components/Notice";
import { useApp } from "@/lib/app-context";
import type { StockMoveType } from "@/lib/types";

export default function InventoryDocumentsPage() {
  const {
    products,
    stockMoves,
    currentUser,
    hydrated,
    createInventoryMove,
    postInventoryMove,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const [moveProduct, setMoveProduct] = useState("P002");
  const [moveType, setMoveType] = useState<StockMoveType>("入庫");
  const [moveQty, setMoveQty] = useState("10");
  const [countQty, setCountQty] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drafts = useMemo(
    () => stockMoves.filter((m) => (m.Status ?? "Posted") === "Draft"),
    [stockMoves],
  );

  function runCreate(asDraft: boolean) {
    setFlash(null);
    setError(null);
    const n = Number.parseInt(moveQty, 10);
    const counted =
      moveType === "盤點調整" ? Number.parseInt(countQty, 10) : undefined;
    const result = createInventoryMove({
      productId: moveProduct,
      moveType,
      qty: moveType === "盤點調整" ? 0 : n,
      countedQty: counted,
      asDraft,
      note: `${moveType}（庫存單據）`,
    });
    if (!result.ok) {
      setError(result.message ?? "失敗");
      return;
    }
    setFlash(result.message ?? "完成");
  }

  function runPost(moveId: string) {
    setFlash(null);
    setError(null);
    const result = postInventoryMove(moveId);
    if (!result.ok) {
      setError(result.message ?? "過帳失敗");
      return;
    }
    setFlash(result.message ?? "已過帳");
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="庫存單據" />
        <Notice kind="info">載入中…</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="庫存單據（入出庫／盤點）"
        description="草稿不改現有量；Admin 過帳後才入帳。一般出庫不可超過可用量。"
        actions={
          <Link href="/inventory/" className="btn-ghost text-sm">
            回庫存查詢
          </Link>
        }
      />

      <Notice kind="info">
        身分：{currentUser.User_Name}（{currentUser.Role}）。
        {isAdmin
          ? "你可以過帳期初／入出庫／盤點。"
          : "Staff 可建入出庫草稿；過帳與盤點調整需管理者。"}
      </Notice>

      {flash && <Notice kind="info">{flash}</Notice>}
      {error && (
        <Notice kind="error" title="無法完成">
          {error}
        </Notice>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-[var(--muted)]">
          商品
          <select
            className="field mt-1 text-sm"
            value={moveProduct}
            onChange={(e) => setMoveProduct(e.target.value)}
          >
            {products
              .filter((p) => p.Is_Active)
              .map((p) => (
                <option key={p.Product_ID} value={p.Product_ID}>
                  {p.Product_ID} {p.Product_Name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-xs text-[var(--muted)]">
          類型
          <select
            className="field mt-1 text-sm"
            value={moveType}
            onChange={(e) => setMoveType(e.target.value as StockMoveType)}
          >
            <option value="期初">期初</option>
            <option value="入庫">入庫</option>
            <option value="出庫">出庫（非銷售）</option>
            <option value="盤點調整">盤點調整</option>
          </select>
        </label>
        {moveType === "盤點調整" ? (
          <label className="text-xs text-[var(--muted)]">
            實盤量
            <input
              className="field mt-1 w-24 text-sm"
              value={countQty}
              onChange={(e) => setCountQty(e.target.value)}
            />
          </label>
        ) : (
          <label className="text-xs text-[var(--muted)]">
            數量（正整數）
            <input
              className="field mt-1 w-24 text-sm"
              value={moveQty}
              onChange={(e) => setMoveQty(e.target.value)}
            />
          </label>
        )}
        <button
          type="button"
          className="btn-ghost text-sm"
          onClick={() => runCreate(true)}
        >
          存草稿
        </button>
        {isAdmin ? (
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => runCreate(false)}
          >
            直接過帳
          </button>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">待過帳草稿</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">目前沒有草稿。</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {drafts.map((m) => (
              <li key={m.Move_ID} className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{m.Move_ID}</span>
                <span>
                  {m.Move_Type ?? m.Reason} {m.Product_ID}{" "}
                  {m.Qty > 0 ? "+" : ""}
                  {m.Qty}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  來源 {m.Source_Doc_ID ?? "—"}
                </span>
                {isAdmin ? (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => runPost(m.Move_ID)}
                  >
                    過帳
                  </button>
                ) : (
                  <span className="text-xs text-[var(--muted)]">待管理者過帳</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
