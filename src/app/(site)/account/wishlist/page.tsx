import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/auth-customer";
import { priceProduct } from "@/lib/gold";
import { ProductCard } from "@/components/site/ProductCard";

export default async function WishlistPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=/account/wishlist");

  const items = await prisma.wishlist.findMany({
    where: { customerId: session.customerId },
    include: { product: { include: { images: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: { createdAt: "desc" },
  });

  const priced = await Promise.all(
    items.map(async (i) => ({ ...i.product, price: await priceProduct(i.product) })),
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-gold-dark">Saved Items</p>
      <h1 className="mt-2 font-display text-3xl text-maroon">My Wishlist</h1>
      <div className="gold-divider my-8 w-32" />

      {priced.length === 0 ? (
        <p className="text-brown-light">Your wishlist is empty. Browse our collections to save your favourite pieces.</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {priced.map((p) => (
            <ProductCard key={p.id} product={{ ...p, images: p.images.length ? p.images : [] }} initiallyWishlisted />
          ))}
        </div>
      )}
    </div>
  );
}
