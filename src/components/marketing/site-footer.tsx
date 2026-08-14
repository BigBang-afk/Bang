import Link from "next/link";

import { Logo } from "@/components/logo";
import { riskDisclaimer, siteConfig } from "@/lib/config/site";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#markets", label: "Markets" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#how-it-works", label: "How it works" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#faq", label: "FAQ" },
      { href: `mailto:${siteConfig.supportEmail}`, label: "Contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create account" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-sm text-muted-foreground">
              {siteConfig.description}
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-medium text-foreground">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-border/60 bg-muted/40 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Risk disclaimer.</span>{" "}
            {riskDisclaimer}
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <p>Built for crypto, forex, gold & index traders.</p>
        </div>
      </div>
    </footer>
  );
}
