"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-context";
import {
  CUSTOMER_TYPES,
  NOTES_MAX,
  PAYMENT_TERMS,
  type FieldErrors,
} from "@/lib/customer-rules";
import type {
  Customer,
  CustomerType,
  PaymentTerms,
} from "@/lib/types";
import { Notice } from "@/components/Notice";

type Mode = "create" | "edit";

export function CustomerForm({
  mode,
  initial,
}: {
  mode: Mode;
  initial?: Customer;
}) {
  const router = useRouter();
  const {
    currentUser,
    createCustomer,
    updateCustomer,
    peekNextCustomerId,
    hydrated,
  } = useApp();
  const isAdmin = currentUser.Role === "Admin";

  const [name, setName] = useState(initial?.Customer_Name ?? "");
  const [type, setType] = useState<CustomerType>(
    initial?.Customer_Type ?? "零售",
  );
  const [phone, setPhone] = useState(initial?.Phone ?? "");
  const [email, setEmail] = useState(initial?.Email ?? "");
  const [notes, setNotes] = useState(initial?.Notes ?? "");
  const [contact, setContact] = useState(initial?.Contact ?? "");
  const [terms, setTerms] = useState<PaymentTerms>(
    initial?.Payment_Terms ?? "現結",
  );
  const [credit, setCredit] = useState(
    String(initial?.Credit_Limit ?? 0),
  );
  const [isActive, setIsActive] = useState(initial?.Is_Active ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewId = useMemo(
    () => (mode === "edit" ? initial!.Customer_ID : peekNextCustomerId()),
    [mode, initial, peekNextCustomerId],
  );

  function onTermsChange(next: PaymentTerms) {
    setTerms(next);
    if (next === "現結") setCredit("0");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setSaving(true);

    if (mode === "create") {
      const result = createCustomer({
        Customer_Name: name,
        Customer_Type: type,
        Phone: phone,
        Email: email,
        Notes: notes,
        Contact: contact || undefined,
        ...(isAdmin
          ? {
              Payment_Terms: terms,
              Credit_Limit: credit,
              Is_Active: isActive,
            }
          : {}),
      });
      setSaving(false);
      if (!result.ok) {
        setErrors(result.errors ?? { form: result.message });
        setBanner(result.message ?? "儲存失敗");
        return;
      }
      setErrors({});
      const id = result.customer!.Customer_ID;
      router.push(
        `/customers/${id}/?created=1&msg=${encodeURIComponent(result.message ?? `已建立 ${id}`)}`,
      );
      return;
    }

    const patch = {
      Customer_Name: name,
      Customer_Type: type,
      Phone: phone,
      Email: email,
      Notes: notes,
      Contact: contact || undefined,
      ...(isAdmin
        ? {
            Payment_Terms: terms,
            Credit_Limit: credit,
            Is_Active: isActive,
          }
        : {}),
    };
    const result = updateCustomer(initial!.Customer_ID, patch);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors ?? { form: result.message });
      setBanner(result.message ?? "儲存失敗");
      return;
    }
    setErrors({});
    router.push(`/customers/${initial!.Customer_ID}/`);
  }

  function handleCancel() {
    if (mode === "edit" && initial) {
      router.push(`/customers/${initial.Customer_ID}/`);
    } else {
      router.push("/customers/");
    }
  }

  if (!hydrated) {
    return <Notice kind="info">載入本機客戶資料中…</Notice>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {banner && (
        <Notice kind="error" title="無法儲存">
          {banner}
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Customer_ID"
          hint="系統產生，建立後不可修改"
          error={errors.Customer_ID}
        >
          <input
            className="field w-full bg-[var(--linen)]/60"
            value={previewId}
            readOnly
            aria-readonly
          />
        </Field>

        <Field
          label="客戶名稱"
          required
          error={errors.Customer_Name}
        >
          <input
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.Customer_Name)}
            placeholder="例如：霧嶼手沖館"
          />
        </Field>

        <Field label="客戶分類" required error={errors.Customer_Type}>
          <select
            className="field w-full"
            value={type}
            onChange={(e) => setType(e.target.value as CustomerType)}
          >
            {CUSTOMER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="聯絡人" hint="選填">
          <input
            className="field w-full"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="聯絡窗口姓名"
          />
        </Field>

        <Field label="電話" hint="選填；保留前導 0，以文字儲存">
          <input
            className="field w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="02-2555-0101"
            inputMode="tel"
          />
        </Field>

        <Field label="Email" hint="選填；有填才檢核格式" error={errors.Email}>
          <input
            className="field w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="buyer@example.tw"
            aria-invalid={Boolean(errors.Email)}
          />
        </Field>

        <Field
          label="付款條件"
          hint={isAdmin ? "Admin 可改" : "Staff 唯讀；新增固定現結"}
          error={errors.Payment_Terms}
        >
          {isAdmin ? (
            <select
              className="field w-full"
              value={terms}
              onChange={(e) => onTermsChange(e.target.value as PaymentTerms)}
            >
              {PAYMENT_TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="field w-full bg-[var(--linen)]/60"
              value={mode === "create" ? "現結" : terms}
              readOnly
            />
          )}
        </Field>

        <Field
          label="信用額度（TWD）"
          hint={
            isAdmin
              ? "非負整數；現結須為 0"
              : "Staff 唯讀；新增固定 0（本週不計算可用額度）"
          }
          error={errors.Credit_Limit}
        >
          {isAdmin ? (
            <input
              className="field w-full"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              inputMode="numeric"
              aria-invalid={Boolean(errors.Credit_Limit)}
            />
          ) : (
            <input
              className="field w-full bg-[var(--linen)]/60"
              value={mode === "create" ? "0" : credit}
              readOnly
            />
          )}
        </Field>

        <Field
          label="啟用狀態"
          hint={isAdmin ? "Admin 可停用／重新啟用" : "Staff 不可變更"}
        >
          {isAdmin ? (
            <select
              className="field w-full"
              value={isActive ? "1" : "0"}
              onChange={(e) => setIsActive(e.target.value === "1")}
            >
              <option value="1">啟用</option>
              <option value="0">停用</option>
            </select>
          ) : (
            <input
              className="field w-full bg-[var(--linen)]/60"
              value={isActive ? "啟用" : "停用"}
              readOnly
            />
          )}
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="備註"
            hint={`選填，最多 ${NOTES_MAX} 字`}
            error={errors.Notes}
          >
            <textarea
              className="field min-h-[88px] w-full resize-y"
              value={notes}
              maxLength={NOTES_MAX}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="偏好產區、取貨備註等（勿填敏感資料）"
            />
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {notes.length}/{NOTES_MAX}
            </p>
          </Field>
        </div>
      </div>

      {!isAdmin && (
        <Notice kind="info">
          一般使用者可維護名稱、分類與聯絡資料；付款條件／信用額度／啟用狀態僅系統管理者可改。
        </Notice>
      )}

      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving
            ? "儲存中…"
            : mode === "create"
              ? "建立客戶"
              : "儲存變更"}
        </button>
        <button type="button" className="btn-ghost" onClick={handleCancel}>
          取消
        </button>
        {mode === "create" && (
          <p className="w-full text-xs text-[var(--muted)]">
            建立後會出現在客戶列表，首頁「客戶數」同步更新（含停用客戶）。
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-[var(--brand-deep)]">
        {label}
        {required && <span className="text-[var(--danger)]"> *</span>}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
          {hint}
        </span>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <span className="mt-1 block text-xs text-[var(--danger)]" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
