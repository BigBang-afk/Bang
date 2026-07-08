import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Quotex OTC Perfect Signal Scanner",
  description:
    "Probability-based CALL/PUT signal dashboard for Quotex OTC pairs. Educational tool — not financial advice, no guaranteed profit.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg font-sans antialiased">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
