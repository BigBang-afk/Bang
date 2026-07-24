import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurum Signals — AI Crypto Trading Platform",
  description: "Institutional-grade AI crypto signal platform for MEXC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-void font-sans antialiased">{children}</body>
    </html>
  );
}
