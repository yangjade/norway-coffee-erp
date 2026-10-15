import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import { AppProvider } from "@/lib/app-context";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const notoSans = Noto_Sans_TC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSerif = Noto_Serif_TC({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "挪威的咖啡｜配銷 ERP 首頁 v1",
  description: "挪威的咖啡配銷模組 — 系統首頁與角色權限教學版",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${notoSans.variable} ${notoSerif.variable} antialiased`}
      >
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
