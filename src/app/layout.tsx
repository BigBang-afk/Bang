import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Zarghoon Jewellers Quetta | Gold Jewelry in Sarafa Market",
    template: "%s | Zarghoon Jewellers",
  },
  description:
    "Explore premium gold rings, necklaces, bangles, bridal sets and custom jewelry at Zarghoon Jewellers, Liaquat Bazar, Sarafa Market, Quetta.",
  keywords: [
    "Zarghoon Jewellers Quetta",
    "Gold jewelry in Quetta",
    "Jewellery shop in Quetta",
    "Sarafa Market Quetta",
    "Jewelry shop Liaquat Bazar",
    "Bridal jewelry Quetta",
    "Gold rings Quetta",
    "Gold bangles Quetta",
    "Custom jewelry Quetta",
  ],
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivory text-charcoal">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
