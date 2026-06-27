import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRAVAH — Quant Trading Intelligence",
  description: "Predictive Regime-Adaptive Valuation & Allocation Hub",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  );
}
