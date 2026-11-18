"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Notice, PageHeader } from "@/components/Notice";
import { useToast } from "@/components/ToastProvider";
import { useApp } from "@/lib/app-context";
import { roleLabel } from "@/lib/roles";

export default function SettingsPage() {
  const {
    canAccessSettings,
    users,
    setUserActive,
    currentUser,
    resetDemoData,
  } = useApp();
  const { pushToast } = useToast();
  const [confirmUser, setConfirmUser] = useState<{
    id: string;
    next: boolean;
  } | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  if (!canAccessSettings) {
    return (
      <div className="mx-auto max-w-xl space-y-5 animate-rise">
        <PageHeader title="使用者設定" description="僅系統管理者可進入" />
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
                pushToast({
                  tone: "error",
                  title: "已阻擋",
                  message: result.ok
                    ? "不應成功"
                    : `${result.message}（U002 目前：${u002?.Is_Active ? "啟用" : "停用"}）`,
                });
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
    <div className="space-y-5 animate-rise" data-prod-feel="settings-roles">
      <PageHeader
        title="使用者設定"
        description="系統管理者專用 · Admin 可停用員工；Staff 看不到此頁"
        actions={
          <Link
            href="/acceptance/"
            className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
          >
            驗收區
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Notice kind="info">
          <strong className="text-[var(--brand-deep)]">Admin（管理者）</strong>
          ：可進設定、改信控／牌價、接受報價、手動調庫、停用員工。
        </Notice>
        <Notice kind="info">
          <strong className="text-[var(--brand-deep)]">Staff（員工）</strong>
          ：可維護客戶聯絡、新增商品名稱、建立／送出報價、出貨與收款；不可改額度與人員。
        </Notice>
      </div>

      <div className="table-shell table-dense">
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
                      onClick={() =>
                        setConfirmUser({ id: u.User_ID, next: !u.Is_Active })
                      }
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

      <section className="panel p-4 sm:p-5">
        <h2 className="font-display text-base text-[var(--brand-deep)]">
          示範資料
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          重設會載入較完整的示範資料量（足夠分頁），並清除本機已修改內容。
        </p>
        <button
          type="button"
          className="btn-ghost mt-3 text-sm"
          onClick={() => setResetOpen(true)}
        >
          重設為完整樣本
        </button>
      </section>

      <ConfirmDialog
        open={!!confirmUser}
        title={confirmUser?.next ? "重新啟用員工？" : "停用員工？"}
        message={
          confirmUser?.next
            ? "啟用後可再切換為該身分。"
            : "停用後無法再切換為該身分，直到重新啟用。"
        }
        confirmLabel={confirmUser?.next ? "啟用" : "停用"}
        danger={!confirmUser?.next}
        onCancel={() => setConfirmUser(null)}
        onConfirm={() => {
          if (!confirmUser) return;
          const result = setUserActive(confirmUser.id, confirmUser.next);
          pushToast({
            tone: result.ok ? "success" : "error",
            message: result.ok
              ? confirmUser.next
                ? "已重新啟用"
                : "已停用"
              : (result.message ?? "失敗"),
          });
          setConfirmUser(null);
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="重設樣本資料？"
        message="會清除本機已修改資料，還原完整示範資料量。"
        confirmLabel="重設樣本"
        danger
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemoData();
          setResetOpen(false);
          pushToast({ tone: "success", message: "已重設樣本資料" });
        }}
      />
    </div>
  );
}
