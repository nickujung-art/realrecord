import type { Metadata } from "next";
import { Noto_Sans_KR, DM_Sans } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "리얼레코드: 창부이 데이터랩",
  description: "창원·김해 부동산 실거래 신고가 추적 및 분석 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full bg-surface antialiased">{children}</body>
    </html>
  );
}
