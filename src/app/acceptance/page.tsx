"use client";

import { ClassroomSim } from "@/components/ClassroomSim";
import { Notice, PageHeader } from "@/components/Notice";

export default function AcceptancePage() {
  return (
    <div
      className="space-y-6 animate-rise"
      data-prod-feel="acceptance-module"
      data-week8-marker="week8-delivery-20261118"
    >
      <PageHeader
        title="驗收區"
        description="課堂模擬與驗收工具集中於此。含第 8 週：報價轉訂單、交期、訂單狀態路徑。"
      />
      <Notice kind="info">
        第 8 週驗收：Accepted（Q003／Q005）→ 報價轉訂單（填交期）→ 訂單詳情看
        Delivery_Date／改狀態。本週不要求扣庫或應收。重設樣本會還原完整示範資料量。
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
