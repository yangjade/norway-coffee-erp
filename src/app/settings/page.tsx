"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { Notice, PageHeader } from "@/components/Notice";
import { roleLabel } from "@/lib/roles";

export default function SettingsPage() {
  const { canAccessSettings, users, setUserActive, currentUser } = useApp();

  if (!canAccessSettings) {
    return (
      <div className="mx-auto max-w-xl space-y-5 animate-rise">
        <PageHeader
          title="使用者設定"
          description="僅系統管理者可進入"
        />
        <Notice
          kind="denied"
          title={`目前身分為「${roleLabel(currentUser.Role)}」，無法使用此功能`}
          showHomeLink
          footnote="此訊息表示權限不足，不是功能未建置。"
        >
          使用者設定僅系統管理者（Admin）可進入。一般使用者／員工看不到選單入口；即使直接開啟此網址也會被擋下。
          <div className="mt-4 border border-[var(--danger-border)] bg-white/70 p-3">
            <p className="text-xs font-medium text-[var(--danger)]">
              教學測試：第三層操作檢查
            </p>
            <button
              type="button"
              className="mt-2 border border-[var(--danger-border)] px-2 py-1 text-xs text-[var(--danger)]"
              onClick={() => {
                const u002 = users.find((u) => u.User_ID === "U002");
                const result = setUserActive("U002", !(u002?.Is_Active ?? true));
                alert(
                  result.ok
                    ? "不應成功"
                    : `${result.message}\nU002 目前：${u002?.Is_Active ? "啟用" : "停用"}`,
                );
              }}
            >
              嘗試修改 U002（應失敗）
            </button>
          </div>
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="使用者設定"
        description="系統管理者專用 · 教學用權限模擬"
        actions={
          <Link
            href="/"
            className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
          >
            返回首頁
          </Link>
        }
      />

      <Notice kind="info">
        可查看使用者名單，並停用／重新啟用員工 U002。停用後無法再切換為該身分。
        變更會寫入本機並與首頁人員區塊同步；切換為員工後仍看到同一份已修改資料。
      </Notice>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>User_ID</th>
              <th>姓名</th>
              <th>角色</th>
              <th>Is_Active</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.User_ID}>
                <td className="font-mono text-xs">{u.User_ID}</td>
                <td>{u.User_Name}</td>
                <td>{roleLabel(u.Role)}</td>
                <td>{u.Is_Active ? "啟用" : "停用"}</td>
                <td>
                  {u.User_ID === "U002" ? (
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1 text-xs"
                      onClick={() => {
                        const result = setUserActive(u.User_ID, !u.Is_Active);
                        if (!result.ok) alert(result.message);
                      }}
                    >
                      {u.Is_Active ? "停用員工 U002" : "重新啟用員工 U002"}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
