import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { TopNav } from "@/components/layout/TopNav";

export const metadata: Metadata = {
  title: "Bang | AI Crypto Trading Terminal",
  description: "AI-powered institutional-style crypto trading terminal connected to MEXC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <TopNav />
          <main className="min-h-[calc(100vh-56px)] px-4 py-6 max-w-[1600px] mx-auto">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
