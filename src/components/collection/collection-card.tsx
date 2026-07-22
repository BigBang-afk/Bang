import Link from "next/link";
import Image from "next/image";

export function CollectionCard({
  name,
  slug,
  description,
  imageUrl,
  productCount,
}: {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}) {
  return (
    <Link href={`/collections/${slug}`} className="card-lift group relative block overflow-hidden rounded-sm">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-charcoal">
        <Image
          src={imageUrl ?? "/placeholder-product.svg"}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover opacity-90 transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-ivory">
          <h3 className="font-serif text-xl">{name}</h3>
          {description && <p className="mt-1 line-clamp-2 text-xs text-ivory/70">{description}</p>}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-gold">{productCount} Products</span>
            <span className="text-xs font-medium underline">View Collection</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
