import { useState } from "react";
import { NavLink } from "react-router-dom";
import { shop } from "../data/shop";
import { categories, stoneTags } from "../data/products";
import MegaMenu from "./MegaMenu";

function GemMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
      <path
        d="M14 16h20l5 7-15 13-15-13z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 16h20M9 23h30M18 16l6 20 6-20M14 16l4 7M34 16l-4 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileShopOpen, setMobileShopOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `text-sm tracking-wide uppercase transition-colors hover:text-gold ${
      isActive ? "text-gold" : "text-cream/80"
    }`;

  function closeAll() {
    setOpen(false);
    setMegaOpen(false);
    setMobileShopOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gold/20 bg-ink/95 backdrop-blur">
      <div>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2 text-gold" onClick={closeAll}>
            <GemMark />
            <span className="font-serif-display text-xl tracking-wide text-cream">
              {shop.name}
            </span>
          </NavLink>

          <nav className="hidden items-center gap-8 md:flex">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>

            <div
              className="relative"
              onMouseEnter={() => setMegaOpen(true)}
              onMouseLeave={() => setMegaOpen(false)}
            >
              <NavLink
                to="/products"
                className={linkClass}
                onFocus={() => setMegaOpen(true)}
              >
                <span className="inline-flex items-center gap-1">
                  Collections
                  <svg
                    viewBox="0 0 12 8"
                    className={`h-2.5 w-2.5 transition-transform ${megaOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  >
                    <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
              </NavLink>
              {megaOpen && <MegaMenu onNavigate={() => setMegaOpen(false)} />}
            </div>

            <NavLink to="/about" className={linkClass}>
              About
            </NavLink>
            <NavLink to="/contact" className={linkClass}>
              Contact
            </NavLink>

            <a
              href={`https://wa.me/${shop.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-gold px-4 py-2 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-ink"
            >
              WhatsApp Us
            </a>
          </nav>

          <button
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <span
              className={`h-px w-6 bg-cream transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
            />
            <span className={`h-px w-6 bg-cream transition-opacity ${open ? "opacity-0" : ""}`} />
            <span
              className={`h-px w-6 bg-cream transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
            />
          </button>
        </div>

        {open && (
          <nav className="flex flex-col gap-1 border-t border-gold/20 bg-ink px-6 py-6 md:hidden">
            <NavLink to="/" end className={`${linkClass} py-2`} onClick={closeAll}>
              Home
            </NavLink>

            <button
              className="flex items-center justify-between py-2 text-sm uppercase tracking-wide text-cream/80"
              onClick={() => setMobileShopOpen((o) => !o)}
              aria-expanded={mobileShopOpen}
            >
              Collections
              <svg
                viewBox="0 0 12 8"
                className={`h-2.5 w-2.5 transition-transform ${mobileShopOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path d="M1 1l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>

            {mobileShopOpen && (
              <div className="ml-4 flex flex-col gap-3 border-l border-gold/15 py-2 pl-4">
                <p className="text-xs uppercase tracking-wide text-gold-dark">Category</p>
                {categories.map((cat) => (
                  <NavLink
                    key={cat}
                    to={`/products?category=${encodeURIComponent(cat)}`}
                    className="text-sm text-cream/70 hover:text-gold"
                    onClick={closeAll}
                  >
                    {cat}
                  </NavLink>
                ))}
                <p className="mt-2 text-xs uppercase tracking-wide text-gold-dark">Stone</p>
                {stoneTags.map((tag) => (
                  <NavLink
                    key={tag}
                    to={`/products?tag=${encodeURIComponent(tag)}`}
                    className="text-sm text-cream/70 hover:text-gold"
                    onClick={closeAll}
                  >
                    {tag}
                  </NavLink>
                ))}
                <NavLink
                  to="/products"
                  className="mt-2 text-sm text-gold"
                  onClick={closeAll}
                >
                  View All Collections
                </NavLink>
              </div>
            )}

            <NavLink to="/about" className={`${linkClass} py-2`} onClick={closeAll}>
              About
            </NavLink>
            <NavLink to="/contact" className={`${linkClass} py-2`} onClick={closeAll}>
              Contact
            </NavLink>

            <a
              href={`https://wa.me/${shop.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 w-fit rounded-full border border-gold px-4 py-2 text-sm uppercase tracking-wide text-gold"
            >
              WhatsApp Us
            </a>
          </nav>
        )}
      </div>
    </header>
  );
}
