import Link from "next/link";
import { Notice, PageHeader } from "@/components/Notice";

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-xl space-y-5 animate-rise">
      <PageHeader title="出貨" description="模組預留頁" />
      <Notice
        kind="reserved"
        title="出貨模組預計第 11 週完成"
        showHomeLink
        footnote="此訊息表示功能尚未完成，不是權限不足。"
      >
        此頁為預留入口，目前無法建立或確認出貨單。請先從首頁或訂單處理待出貨清單。
      </Notice>
      <Link
        href="/orders"
        className="text-sm text-[var(--brand)] underline-offset-2 transition hover:underline"
      >
        先查看訂單
      </Link>
    </div>
  );
}
