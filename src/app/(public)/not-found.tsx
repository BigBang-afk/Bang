import Link from "next/link";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-serif text-6xl text-gold">404</p>
      <h1 className="mt-4 font-serif text-2xl text-charcoal">Page Not Found</h1>
      <p className="mt-2 max-w-md text-sm text-charcoal/60">
        The page, product, or collection you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <LinkButton href="/" variant="gold">Back to Home</LinkButton>
        <LinkButton href="/products" variant="outline">Browse Products</LinkButton>
      </div>
      <p className="mt-6 text-xs text-charcoal/40">
        Need help? <Link href="/contact" className="underline">Contact us</Link>
      </p>
    </div>
  );
}
