import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { getCurrentProfile } from "@/lib/auth/session";

const links = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#markets", label: "Markets" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {profile ? (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard">Go to Dashboard</Link>}
            />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
                nativeButton={false}
                render={<Link href="/login">Log in</Link>}
              />
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/register">Start free</Link>}
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
