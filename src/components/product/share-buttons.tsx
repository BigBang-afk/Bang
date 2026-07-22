"use client";

import { Facebook, Twitter, LinkIcon, Printer } from "lucide-react";
import { toast } from "sonner";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/15 text-charcoal/60 hover:border-charcoal hover:text-charcoal"
      >
        <Facebook size={16} />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank" rel="noopener noreferrer" aria-label="Share on X"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/15 text-charcoal/60 hover:border-charcoal hover:text-charcoal"
      >
        <Twitter size={16} />
      </a>
      <button
        type="button"
        aria-label="Copy link"
        onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied to clipboard"); }}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/15 text-charcoal/60 hover:border-charcoal hover:text-charcoal"
      >
        <LinkIcon size={16} />
      </button>
      <button
        type="button"
        aria-label="Print product details"
        onClick={() => window.print()}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/15 text-charcoal/60 hover:border-charcoal hover:text-charcoal"
      >
        <Printer size={16} />
      </button>
    </div>
  );
}
