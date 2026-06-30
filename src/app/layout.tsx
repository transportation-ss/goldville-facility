import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "好好園館大平台",
  description: "好好園館內部管理平台",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="h-full">
      <body className="h-full bg-gray-50 antialiased">{children}</body>
    </html>
  )
}
