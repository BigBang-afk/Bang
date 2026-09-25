import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLinks } from "@/components/NavLinks";

export const metadata: Metadata = {
  title: "AI Lead Assistant",
  description: "Respond to and follow up with real-estate leads faster.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">
                AL
              </span>
              <span className="hidden sm:inline">AI Lead Assistant</span>
            </Link>
            <NavLinks />
            <Link href="/leads/new" className="btn-primary ml-auto whitespace-nowrap">
              <span aria-hidden>+</span> Add<span className="hidden sm:inline"> lead</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
