import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { UserMenu } from "@/components/site/user-menu";

const links = [
  { href: "/#markets", label: "Markets" },
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
];

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-foreground-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session?.user ? (
            <UserMenu
              name={session.user.name ?? "Trader"}
              email={session.user.email ?? ""}
              role={session.user.role}
              avatarColor={session.user.avatarColor}
            />
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/register" variant="primary" size="sm">
                Get started free
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
