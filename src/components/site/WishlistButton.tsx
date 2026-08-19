"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import clsx from "clsx";

export function WishlistButton({
  productId,
  initiallyWishlisted = false,
  className,
}: {
  productId: string;
  initiallyWishlisted?: boolean;
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initiallyWishlisted);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      if (wishlisted) {
        const res = await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
        if (res.ok) setWishlisted(false);
      } else {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.ok) setWishlisted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-105",
        className,
      )}
    >
      <Heart className={clsx("h-4.5 w-4.5", wishlisted ? "fill-maroon text-maroon" : "text-brown-light")} />
    </button>
  );
}
