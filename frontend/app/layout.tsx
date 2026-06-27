import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PRAVAH — Quant Trading Intelligence",
  description: "Predictive Regime-Adaptive Valuation & Allocation Hub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
