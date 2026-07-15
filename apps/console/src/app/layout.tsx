import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { BRAND_ICON_SRC, BRAND_NAME } from "@/lib/brand";

import "@qiyun/ui/globals.css";
import "@/styles/console.css";
import "@/styles/v2-prototype.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.APP_URL?.trim() ||
      "http://localhost:3000",
  ),
  title: `${BRAND_NAME} · 工业官网获客系统`,
  description: "AI 接待、产品咨询、询盘留资、线索跟进一体化平台",
  icons: {
    icon: BRAND_ICON_SRC,
    apple: BRAND_ICON_SRC,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
        >
          跳到主要内容
        </a>
        {children}
      </body>
    </html>
  );
}
