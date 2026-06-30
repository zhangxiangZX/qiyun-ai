import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../styles/console.css";

export const metadata: Metadata = {
  title: "Qiyun AI Console",
  description: "Qiyun AI enterprise console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
