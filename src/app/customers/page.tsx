"use client";

import Link from "next/link";
import { useApp } from "@/lib/app-context";
import { Notice, PageHeader } from "@/components/Notice";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { customers, updateCustomer, currentUser } = useApp();
  const isAdmin = currentUser.Role === "Admin";

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="客戶"
        description={
          isAdmin
            ? "樣本列表 · 管理者可改聯絡人／啟用狀態（同步至本機）"
            : "唯讀樣本 · 對應 Customer（C001–C005）"
        }
        actions={
          <Link
            href="/"
            className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
          >
            返回首頁
          </Link>
        }
      />

      {isAdmin ? (
        <Notice kind="info">
          本週可簡單編輯聯絡人與狀態；變更會與首頁／訂單共用同一份本機資料。
        </Notice>
      ) : (
        <Notice kind="reserved" footnote="此為未建置功能說明，不是權限不足。">
          員工僅供查閱；客戶修改僅系統管理者可操作。
        </Notice>
      )}

      {customers.length === 0 ? (
        <Notice kind="empty">目前沒有客戶資料</Notice>
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Customer_ID</th>
                <th>客戶名稱</th>
                <th>聯絡人</th>
                <th>地區</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.Customer_ID}>
                  <td className="font-mono text-xs">{c.Customer_ID}</td>
                  <td>{c.Customer_Name}</td>
                  <td>
                    {isAdmin ? (
                      <input
                        className="field w-28"
                        value={c.Contact}
                        aria-label={`${c.Customer_ID} 聯絡人`}
                        onChange={(e) =>
                          updateCustomer(c.Customer_ID, {
                            Contact: e.target.value,
                          })
                        }
                      />
                    ) : (
                      c.Contact
                    )}
                  </td>
                  <td>{c.Region}</td>
                  <td>
                    {isAdmin ? (
                      <select
                        className="field text-xs"
                        value={c.Status}
                        aria-label={`${c.Customer_ID} 狀態`}
                        onChange={(e) =>
                          updateCustomer(c.Customer_ID, {
                            Status: e.target.value as Customer["Status"],
                          })
                        }
                      >
                        <option value="啟用">啟用</option>
                        <option value="停用">停用</option>
                      </select>
                    ) : (
                      c.Status
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
