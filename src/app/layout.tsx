import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  title: `${SITE.appName} — 스크래치 디버깅 AI 협업`,
  description:
    "학생 수준차를 자동으로 흡수하는 Teacher-in-the-Loop 스크래치 디버깅 수업 도구",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
