import { useState } from "react";
import { NavLink } from "react-router-dom";
import { shop } from "../data/shop";

const links = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Collections" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

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

  const linkClass = ({ isActive }) =>
    `text-sm tracking-wide uppercase transition-colors hover:text-gold ${
      isActive ? "text-gold" : "text-cream/80"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-ink/95 backdrop-blur border-b border-gold/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-gold"
          onClick={() => setOpen(false)}
        >
          <GemMark />
          <span className="font-serif-display text-xl tracking-wide text-cream">
            {shop.name}
          </span>
        </NavLink>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === "/"} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
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
        <nav className="flex flex-col gap-4 border-t border-gold/20 bg-ink px-6 py-6 md:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <a
            href={`https://wa.me/${shop.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-full border border-gold px-4 py-2 text-sm uppercase tracking-wide text-gold"
          >
            WhatsApp Us
          </a>
        </nav>
      )}
    </header>
  );
}
