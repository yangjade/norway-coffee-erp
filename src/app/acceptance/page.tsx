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
        title="驗收區"
        description="第 8 週訂單＋第 10 週庫存：各有一鍵 01–12。"
      />
      <Notice kind="info">
        第 8 週：報價轉單／Draft→Confirmed。第 10 週：期初／保留／缺貨整單擋／入出庫盤點。本機
        storage v7（重設樣本）。
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
