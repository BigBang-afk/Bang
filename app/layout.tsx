import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quotex Signal Scanner",
  description: "Upload a 1-minute candlestick chart and get a pattern + support/resistance based signal read.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
