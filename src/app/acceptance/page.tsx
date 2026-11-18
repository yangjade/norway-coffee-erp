"use client";

import { ClassroomSim } from "@/components/ClassroomSim";
import { Notice, PageHeader } from "@/components/Notice";

export default function AcceptancePage() {
  return (
    <div
      className="space-y-6 animate-rise"
      data-prod-feel="acceptance-module"
      data-week8-marker="week8-official-20261118"
    >
      <PageHeader
        title="驗收區"
        description="第 8 週正式：Draft／Confirmed／Cancelled、雙交期、驗收 01–12。"
      />
      <Notice kind="info">
        請按「一鍵跑 01–12」。案例 QT-20261118-001 總額 7,560；確認不扣庫。本機
        storage v6（重設樣本）。
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
