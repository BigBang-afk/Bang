import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-navy-950 mt-24">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="text-sm text-slate-400 mt-3">
            A signal and analysis platform for binary-options traders. FlexX Signal never executes trades on your behalf.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200 mb-3">Product</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link to="/features" className="hover:text-cyan-400">Features</Link></li>
            <li><Link to="/performance" className="hover:text-cyan-400">Live Performance</Link></li>
            <li><Link to="/pricing" className="hover:text-cyan-400">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200 mb-3">Company</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link to="/about" className="hover:text-cyan-400">About</Link></li>
            <li><Link to="/risk-disclosure" className="hover:text-cyan-400">Risk Disclosure</Link></li>
            <li><Link to="/terms" className="hover:text-cyan-400">Terms &amp; Privacy</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-200 mb-3">Account</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link to="/login" className="hover:text-cyan-400">Log in</Link></li>
            <li><Link to="/register" className="hover:text-cyan-400">Register</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-slate-500 px-4">
        FlexX Signal provides analysis and high-confidence signals for educational and informational purposes only.
        No outcome is guaranteed. Trading involves risk. &copy; {new Date().getFullYear()} FlexX Signal.
      </div>
    </footer>
  );
}
