import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const socialIcons = [
  // X / Twitter
  <path key="x" d="M18.9 3H21.6L15.6 10.2L22.7 21H17.1L12.9 14.9L8.1 21H5.4L11.8 13.3L5 3H10.8L14.6 8.6L18.9 3ZM17.9 19.2H19.4L9.9 4.7H8.3L17.9 19.2Z" />,
  // GitHub
  <path key="gh" fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.58 2 12.19C2 16.68 4.87 20.47 8.84 21.8C9.34 21.89 9.52 21.58 9.52 21.31C9.52 21.07 9.51 20.24 9.51 19.36C7 19.9 6.35 18.94 6.15 18.44C6.03 18.15 5.42 17.16 4.88 16.9C4.44 16.68 3.81 16.14 4.87 16.13C5.86 16.11 6.57 17.05 6.81 17.42C7.94 19.32 9.7 18.78 10.29 18.47C10.39 17.65 10.71 17.11 11.06 16.8C8.34 16.49 5.5 15.42 5.5 10.69C5.5 9.35 5.97 8.25 6.83 7.39C6.7 7.08 6.28 5.83 6.95 4.14C6.95 4.14 7.97 3.81 9.52 4.87C10.17 4.68 10.86 4.59 11.55 4.59C12.24 4.59 12.93 4.68 13.58 4.87C15.13 3.8 16.15 4.14 16.15 4.14C16.82 5.83 16.4 7.08 16.27 7.39C17.13 8.25 17.6 9.34 17.6 10.69C17.6 15.43 14.75 16.49 12.03 16.8C12.47 17.18 12.85 17.92 12.85 19.07C12.85 20.71 12.84 21.06 12.84 21.31C12.84 21.58 13.02 21.9 13.52 21.8C17.49 20.47 20 16.68 20 12.19C20 6.58 15.52 2 12 2Z" />,
  // LinkedIn
  <path key="li" d="M6.94 5C6.94 6.1 6.06 7 4.97 7C3.88 7 3 6.1 3 5C3 3.9 3.88 3 4.97 3C6.06 3 6.94 3.9 6.94 5ZM7 8.48H3V21H7V8.48ZM13.32 8.48H9.35V21H13.28V14.43C13.28 10.77 18.05 10.45 18.05 14.43V21H22V13.07C22 6.9 14.94 7.13 13.28 10.16L13.32 8.48Z" />,
];

function SocialIcon({ path }: { path: React.ReactElement }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      {path}
    </svg>
  );
}

const columns = [
  {
    title: "Product",
    links: [
      { label: "Markets", href: "/#markets" },
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Risk Disclosure", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-background-elevated">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-foreground-muted">
              Institutional-grade market data, AI-driven insights, and real-time
              TradingView charts — built for traders who move fast.
            </p>
            <div className="mt-5 flex gap-3">
              {socialIcons.map((path, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-subtle text-foreground-muted transition-colors hover:text-brand-green hover:border-brand-green/40"
                >
                  <SocialIcon path={path} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground-muted transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-6 text-xs text-foreground-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Nexara Markets, Inc. All rights reserved.</p>
          <p>Trading involves risk. Charts powered by TradingView.</p>
        </div>
      </div>
    </footer>
  );
}
