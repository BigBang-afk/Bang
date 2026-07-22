import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">404</p>
      <h1 className="mt-3 font-serif-display text-4xl text-ink">Page Not Found</h1>
      <p className="mt-3 text-ink/60">The page you're looking for doesn't exist.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-full bg-gold-gradient px-6 py-3 text-sm uppercase tracking-wide text-ink shadow-gold-glow transition-transform hover:scale-105"
      >
        Back to Home
      </Link>
    </div>
  );
}
