import type { Metadata } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const SITE_NAME = "Zarghoon Jewellers";
const SITE_DESCRIPTION =
  "Zarghoon Jewellers — premium 24K, 21K & 18K gold jewellery in Liaquat Bazar Sarafa Market, Quetta. Timeless gold, trusted legacy.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: `${SITE_NAME} — Pure Gold Jewellery, Quetta`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Zarghoon Jewellers",
    "Zarghoon Jewellers Quetta",
    "gold jewellery Quetta",
    "24K gold jewellery Quetta",
    "21K gold jewellery Pakistan",
    "gold rate Quetta",
    "Liaquat Bazar Sarafa Market",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Pure Gold Jewellery, Quetta`,
    description: SITE_DESCRIPTION,
    locale: "en_PK",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Pure Gold Jewellery, Quetta`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-brown">{children}</body>
    </html>
  );
}
