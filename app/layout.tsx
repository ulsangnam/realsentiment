import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RealSentiment — 진짜 민심",
  description: "블록체인으로 검증된 실시간 여론조사 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className={`${inter.className} min-h-full flex flex-col antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
