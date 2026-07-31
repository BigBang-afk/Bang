import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Quotex Real Market AI Signals",
  description:
    "Independent market-analysis and signal platform for forex, gold and crypto. Manually execute signals on Quotex or any trading platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
