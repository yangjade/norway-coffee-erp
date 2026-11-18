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
    >
      <PageHeader
        title="驗收總覽"
        description="T／S／I 三組入口；比截圖更好找。資料一次重置即可課堂演示。"
      />
      <Notice kind="info">
        <div className="flex flex-wrap gap-3 text-sm" id="t01">
          <a className="text-[var(--brand)] underline" href="#t01">
            T01–T12
          </a>
          <a className="text-[var(--brand)] underline" href="#s01" id="s01">
            S01–S13 訂單
          </a>
          <a className="text-[var(--brand)] underline" href="#i01">
            I01–I17 庫存
          </a>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          建議流程：重設樣本 → 報價轉單 → 確認保留 → 缺貨擋 → 入庫再確認。本機
          storage v7。Staff／Admin 差異會在失敗訊息裡說清楚。
        </p>
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
