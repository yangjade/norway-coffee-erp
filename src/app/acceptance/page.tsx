"use client";

import { ClassroomSim } from "@/components/ClassroomSim";
import { Notice, PageHeader } from "@/components/Notice";

export default function AcceptancePage() {
  return (
    <div className="space-y-6 animate-rise" data-prod-feel="acceptance-module">
      <PageHeader
        title="驗收區"
        description="課堂模擬與驗收工具集中於此。日常營運請使用左側主模組；此區不影響正式操作流程。"
      />
      <Notice kind="info">
        可載入基準／展示資料、模擬越權、載入失敗與欄位對照。重設樣本會還原完整示範資料量。
      </Notice>
      <ClassroomSim embedded />
    </div>
  );
}
