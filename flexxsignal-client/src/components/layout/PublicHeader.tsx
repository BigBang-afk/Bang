import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuthStore } from "../../store/authStore";

const links = [
  { to: "/features", label: "Features" },
  { to: "/performance", label: "Live Performance" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/"><Logo /></Link>

        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `text-sm ${isActive ? "text-cyan-400" : "text-slate-300 hover:text-slate-100"}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/app/dashboard" className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Log in</Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </>
          )}
        </div>

        <button className="md:hidden text-slate-200 text-2xl" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          &#9776;
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-slate-300">{l.label}</Link>
          ))}
          <div className="flex gap-3 pt-2">
            {isAuthenticated ? (
              <Link to="/app/dashboard" className="btn-primary flex-1">Dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary flex-1">Log in</Link>
                <Link to="/register" className="btn-primary flex-1">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
