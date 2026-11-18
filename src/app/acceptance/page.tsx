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
        description="銷售 S01–S13 · Draft／Confirmed／Cancelled · 雙交期 · 確認不扣庫"
      />
      <Notice kind="info">
        銷售請按「一鍵跑 S01–S13」（含晚交勾同意）。案例 QT-20261118-001 總額
        7,560；確認不扣庫。本機 storage v6。庫存 I 系列由第 10 週區塊負責。
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
