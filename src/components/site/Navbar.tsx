"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Search, User, Heart } from "lucide-react";
import clsx from "clsx";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/collections", label: "Collections" },
  { href: "/gold-rate", label: "Gold Rate" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact Us" },
];

export function Navbar({
  businessName,
  isLoggedIn,
}: {
  businessName: string;
  isLoggedIn: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/collections?search=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
      setQuery("");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-display text-2xl tracking-wide text-maroon">{businessName}</span>
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-gold-dark">
            Pure Gold Jewellery
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "font-sans text-sm tracking-wide transition-colors hover:text-maroon",
                pathname === link.href ? "text-maroon font-medium" : "text-brown-light",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
            className="text-brown-light hover:text-maroon"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href={isLoggedIn ? "/account" : "/login"}
            aria-label="Account"
            className="text-brown-light hover:text-maroon"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link href="/account/wishlist" aria-label="Wishlist" className="text-brown-light hover:text-maroon">
            <Heart className="h-5 w-5" />
          </Link>
          <button
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="text-brown-light hover:text-maroon lg:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-gold/20 bg-ivory px-6 py-3">
          <form onSubmit={onSearchSubmit} className="mx-auto flex max-w-3xl gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for necklaces, rings, bangles…"
              className="w-full rounded-sm border border-cream-dark bg-white px-4 py-2 text-sm outline-none focus:border-gold-dark"
            />
            <button type="submit" className="rounded-sm bg-maroon px-4 py-2 text-sm text-cream">
              Search
            </button>
          </form>
        </div>
      )}

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-gold/20 bg-ivory px-6 py-4 lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                "rounded-sm px-2 py-2.5 text-sm",
                pathname === link.href ? "bg-cream-dark text-maroon" : "text-brown-light",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
