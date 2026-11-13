"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/app-context";
import {
  activeLabel,
  formatCredit,
} from "@/lib/customer-rules";
import {
  reactivateConfirmMessage,
  softDeleteConfirmMessage,
} from "@/lib/customer-soft-delete";
import { formatTwd } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Notice, PageHeader } from "@/components/Notice";
import { PrimaryActionBar } from "@/components/PrimaryActionBar";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/ToastProvider";

export function CustomerDetailClient() {
  const params = useParams();
  const customerId = String(params.customerId ?? "");
  const {
    customers,
    orders,
    quotations,
    hydrated,
    currentUser,
    softDeleteCustomer,
    setCustomerActive,
    tryForceCreditLimit,
    tryForceSoftDelete,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";
  const { pushToast } = useToast();
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [confirmSoftDelete, setConfirmSoftDelete] = useState(false);
  const [confirmReactivate, setConfirmReactivate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("created") === "1") {
      const msg = sp.get("msg");
      setActionMsg(
        msg
          ? decodeURIComponent(msg)
          : `已建立 ${customerId}，已寫入客戶主檔並同步首頁客戶數。`,
      );
    }
  }, [customerId]);

  const customer = useMemo(
    () => customers.find((c) => c.Customer_ID === customerId),
    [customers, customerId],
  );

  const linkedOrders = useMemo(() => {
    return orders
      .filter((o) => o.Customer_ID === customerId)
      .sort((a, b) => {
        const d = b.Order_Date.localeCompare(a.Order_Date);
        return d !== 0 ? d : b.Order_ID.localeCompare(a.Order_ID);
      });
  }, [orders, customerId]);

  const linkedQuotes = useMemo(
    () =>
      quotations
        .filter((q) => q.Customer_ID === customerId)
        .sort((a, b) => b.Quote_Date.localeCompare(a.Quote_Date))
        .slice(0, 5),
    [quotations, customerId],
  );

  if (!hydrated) {
    return (
      <div className="space-y-5 animate-rise">
        <PageHeader title="客戶詳細" description="載入中…" />
        <Notice kind="info">載入本機客戶資料中…</Notice>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-5 animate-rise">
        <PageHeader title="客戶詳細" description={customerId} />
        <Notice kind="empty" title="找不到客戶" showHomeLink>
          編號 {customerId} 不在 Customer 主檔中。可能尚未建立，或本機樣本已重設。
          <div className="mt-3">
            <Link
              href="/customers/"
              className="text-sm text-[var(--brand)] underline-offset-2 hover:underline"
            >
              返回客戶列表
            </Link>
          </div>
        </Notice>
      </div>
    );
  }

  function onSoftDelete() {
    setConfirmSoftDelete(true);
  }

  function onReactivate() {
    setConfirmReactivate(true);
  }

  function forceCreditTest() {
    const before =
      customers.find((c) => c.Customer_ID === "C002")?.Credit_Limit ?? 0;
    const result = tryForceCreditLimit("C002", 50000);
    setActionMsg(
      result.ok
        ? `不應成功：C002 額度已變為 ${result.customer?.Credit_Limit}`
        : `已阻擋：${result.message}（呼叫前額度 ${formatCredit(before)}；拒絕後應仍為 ${formatCredit(before)}）`,
    );
  }

  function forceDeleteTest() {
    const target = customers.find((c) => c.Customer_ID === customerId);
    const before = target?.Is_Active ?? true;
    const result = tryForceSoftDelete(customerId);
    const still = customers.find((c) => c.Customer_ID === customerId)?.Is_Active;
    setActionMsg(
      result.ok
        ? `不應成功：${customerId} 已被停用`
        : `已阻擋刪除／停用：${result.message}（呼叫前 Is_Active=${before}；應仍為啟用／原值）` +
            (still !== undefined ? `；目前仍為 ${still ? "啟用" : "停用"}` : ""),
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader
        title={customer.Customer_Name}
        description={`${customer.Customer_ID} · ${customer.Customer_Type} · ${activeLabel(customer.Is_Active)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/customers/" className="btn-ghost">
              返回列表
            </Link>
            <Link href="/" className="btn-ghost">
              返回首頁
            </Link>
            <Link
              href={`/customers/${customer.Customer_ID}/edit/`}
              className="btn-primary"
            >
              編輯
            </Link>
            {isAdmin &&
              (customer.Is_Active ? (
                <button
                  type="button"
                  className="border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]"
                  onClick={onSoftDelete}
                >
                  刪除客戶（停用）
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onReactivate}
                >
                  重新啟用
                </button>
              ))}
          </div>
        }
      />

      {!customer.Is_Active && (
        <Notice kind="info" title="此客戶已停用（軟刪除）">
          主檔列仍在、Customer_ID 不變、歷史訂單可查。系統不提供實體刪除；僅系統管理者可重新啟用。
        </Notice>
      )}

      {actionMsg && (
        <Notice
          kind={
            actionMsg.startsWith("已阻擋") || actionMsg.startsWith("已")
              ? "info"
              : "error"
          }
        >
          {actionMsg}
        </Notice>
      )}

      <section className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <h2 className="font-display text-base font-semibold tracking-wide text-[var(--brand-deep)]">
          客戶主檔
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Item label="Customer_ID" value={customer.Customer_ID} mono />
          <Item label="客戶名稱" value={customer.Customer_Name} />
          <Item label="客戶分類" value={customer.Customer_Type} />
          <Item label="聯絡人" value={customer.Contact || "—"} />
          <Item label="電話" value={customer.Phone || "—"} />
          <Item label="Email" value={customer.Email || "—"} />
          <Item
            label="付款條件"
            value={customer.Payment_Terms}
            hint={!isAdmin ? "Staff 唯讀" : undefined}
          />
          <Item
            label="信用額度"
            value={`NT$ ${formatCredit(customer.Credit_Limit)}`}
            hint={
              !isAdmin
                ? "Staff 唯讀 · 本週僅顯示核定條件"
                : "本週僅顯示核定條件，不計算可用額度"
            }
          />
          <Item label="啟用狀態" value={activeLabel(customer.Is_Active)} />
          <Item
            label="備註"
            value={customer.Notes || "—"}
            className="sm:col-span-2"
          />
        </dl>
      </section>

      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2">
          <h2 className="font-display text-[0.95rem] font-semibold tracking-wide text-[var(--brand-deep)]">
            既有訂單（Sales_Order）
          </h2>
          <span className="text-xs text-[var(--muted)]">
            依日期新→舊；已取消仍保留
          </span>
        </div>
        {linkedOrders.length === 0 ? (
          <Notice kind="empty">此客戶目前沒有訂單紀錄</Notice>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Order_ID</th>
                  <th>日期</th>
                  <th>狀態</th>
                  <th className="text-right">金額</th>
                </tr>
              </thead>
              <tbody>
                {linkedOrders.map((o) => (
                  <tr key={o.Order_ID}>
                    <td>
                      <Link
                        href={`/orders/${o.Order_ID}/`}
                        className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                      >
                        {o.Order_ID}
                      </Link>
                    </td>
                    <td>{o.Order_Date}</td>
                    <td>
                      <StatusBadge status={o.Order_Status} />
                    </td>
                    <td className="text-right tabular-nums">
                      NT$ {formatTwd(o.Total_Amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-2 border-b border-[var(--border)] pb-2">
          <h2 className="font-display text-[0.95rem] font-semibold tracking-wide text-[var(--brand-deep)]">
            相關報價
          </h2>
          <Link
            href="/quotations/"
            className="text-xs text-[var(--brand)] underline-offset-2 hover:underline"
          >
            全部報價
          </Link>
        </div>
        {linkedQuotes.length === 0 ? (
          <Notice kind="empty">此客戶目前沒有報價紀錄</Notice>
        ) : (
          <ul className="space-y-2 text-sm">
            {linkedQuotes.map((q) => (
              <li
                key={q.Quote_ID}
                className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] py-2 last:border-0"
              >
                <Link
                  href={`/quotations/${q.Quote_ID}/`}
                  className="font-mono text-xs text-[var(--brand)] underline-offset-2 hover:underline"
                >
                  {q.Quote_ID}
                </Link>
                <span className="text-xs text-[var(--muted)]">
                  {q.Quote_Date} · {q.Status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isAdmin && (
        <section className="border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-[var(--danger)]">
              教學測試 · 第三層操作檢查（T08 額度）
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Staff 嘗試將 C002 信用額度改為 50,000 — 應拒絕且原值保持 20,000。
            </p>
            <button
              type="button"
              className="mt-2 border border-[var(--danger-border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--danger)]"
              onClick={forceCreditTest}
            >
              嘗試修改 C002 額度為 50,000（應失敗）
            </button>
          </div>
          <div className="border-t border-[var(--danger-border)] pt-3">
            <p className="text-xs font-medium text-[var(--danger)]">
              教學測試 · 刪除／停用權限
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Staff 嘗試刪除本客戶 — 應拒絕；畫面不提供刪除按鈕。
            </p>
            <button
              type="button"
              className="mt-2 border border-[var(--danger-border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--danger)]"
              onClick={forceDeleteTest}
            >
              嘗試刪除／停用本客戶（應失敗）
            </button>
          </div>
        </section>
      )}

      <PrimaryActionBar
        status={
          <>
            {customer.Customer_ID} · {activeLabel(customer.Is_Active)}
          </>
        }
      >
        <Link
          href={`/customers/${customer.Customer_ID}/edit/`}
          className="btn-primary"
        >
          編輯客戶
        </Link>
        <Link href="/quotations/new/" className="btn-ghost">
          新增報價
        </Link>
        {isAdmin &&
          (customer.Is_Active ? (
            <button
              type="button"
              className="btn-danger"
              onClick={onSoftDelete}
            >
              刪除／停用
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={onReactivate}>
              重新啟用
            </button>
          ))}
      </PrimaryActionBar>

      <ConfirmDialog
        open={confirmSoftDelete}
        title="刪除／停用客戶？"
        message={softDeleteConfirmMessage(
          customer.Customer_ID,
          customer.Customer_Name,
        )}
        confirmLabel="停用"
        danger
        onCancel={() => setConfirmSoftDelete(false)}
        onConfirm={() => {
          const result = softDeleteCustomer(customer.Customer_ID);
          const msg = result.ok
            ? `已刪除／停用 ${customer.Customer_ID}（軟刪除：Is_Active=false；主檔與訂單仍保留）`
            : result.message ?? "操作失敗";
          setActionMsg(msg);
          pushToast({ tone: result.ok ? "success" : "error", message: msg });
          setConfirmSoftDelete(false);
        }}
      />
      <ConfirmDialog
        open={confirmReactivate}
        title="重新啟用客戶？"
        message={reactivateConfirmMessage(
          customer.Customer_ID,
          customer.Customer_Name,
        )}
        confirmLabel="啟用"
        onCancel={() => setConfirmReactivate(false)}
        onConfirm={() => {
          const result = setCustomerActive(customer.Customer_ID, true);
          const msg = result.ok
            ? `已重新啟用 ${customer.Customer_ID}`
            : result.message ?? "操作失敗";
          setActionMsg(msg);
          pushToast({ tone: result.ok ? "success" : "error", message: msg });
          setConfirmReactivate(false);
        }}
      />
    </div>
  );
}

function Item({
  label,
  value,
  mono,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] tracking-[0.06em] text-[var(--muted)]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm text-[var(--brand-deep)] ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </dd>
      {hint && (
        <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p>
      )}
    </div>
  );
}
