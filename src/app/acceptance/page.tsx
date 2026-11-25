"use client";

import { ClassroomSim } from "@/components/ClassroomSim";
import { Notice, PageHeader } from "@/components/Notice";

export default function AcceptancePage() {
  return (
    <div
      className="space-y-6 animate-rise"
      data-prod-feel="acceptance-module"
      data-week8-marker="week8-official-20261118"
      data-week10-marker="week10-inventory-20261118"
      data-week11-marker="week11-shipping-20261125"
    >
      <PageHeader
        title="驗收總覽"
        description="客戶／訂單／庫存／出貨四組入口。一次重置即可課堂演示。"
      />
      <Notice kind="info">
        <div className="flex flex-wrap gap-3 text-sm">
          <a className="text-[var(--brand)] underline" href="#t01">
            T01–T12 客戶
          </a>
          <a className="text-[var(--brand)] underline" href="#s01">
            S01–S13 訂單
          </a>
          <a className="text-[var(--brand)] underline" href="#i01">
            I01–I17 庫存
          </a>
          <a className="text-[var(--brand)] underline" href="#sh01">
            T01–T12 出貨
          </a>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          出貨：草稿不扣庫 → Admin 過帳現有↓保留↓ → 物流 Exception／Delivered
          不改庫。建議：I01–I17 後接著出貨 T01–T12。本機 storage v8。
        </p>
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
