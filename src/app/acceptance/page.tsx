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
        description="T／S／I 三組入口；比截圖更好找。一次重置即可課堂演示。"
      />
      <Notice kind="info">
        <div className="flex flex-wrap gap-3 text-sm">
          <a className="text-[var(--brand)] underline" href="#t01">
            T01–T12
          </a>
          <a className="text-[var(--brand)] underline" href="#s01">
            S01–S13 訂單
          </a>
          <a className="text-[var(--brand)] underline" href="#i01">
            I01–I17 庫存
          </a>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          客戶：一鍵跑 T01–T12（基準 5 客）。銷售：一鍵跑 S01–S13（含晚交勾同意）；案例
          QT-20261118-001 總額 7,560，確認不扣庫。庫存：一鍵跑 I01–I17。建議流程：重設 →
          轉單 → 確認保留 → 缺貨擋 → 入庫再確認。本機 storage v7。
        </p>
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
