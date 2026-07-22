import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { categories, products } from "../data/products";

const ALL = "All";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const tagParam = searchParams.get("tag");
  const activeCategory = categories.includes(categoryParam) ? categoryParam : ALL;

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (activeCategory === ALL || p.category === activeCategory) &&
          (!tagParam || p.tags.includes(tagParam))
      ),
    [activeCategory, tagParam]
  );

  function handleSelectCategory(cat) {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    if (cat === ALL) {
      next.delete("category");
    } else {
      next.set("category", cat);
    }
    setSearchParams(next, { replace: true });
  }

  function clearTag() {
    const next = new URLSearchParams(searchParams);
    next.delete("tag");
    setSearchParams(next, { replace: true });
  }

  return (
    <div>
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Our Collections</p>
          <h1 className="mt-3 font-serif-display text-4xl md:text-5xl">All Jewellery</h1>
          <p className="mx-auto mt-3 max-w-xl text-cream/70">
            Browse rings, necklaces, earrings, and bangles crafted with care by Zarghoon
            Jewellers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap justify-center gap-3">
          {[ALL, ...categories].map((cat) => (
            <button
              key={cat}
              onClick={() => handleSelectCategory(cat)}
              className={`rounded-full border px-5 py-2 text-sm uppercase tracking-wide transition-colors ${
                activeCategory === cat
                  ? "border-gold bg-gold text-ink"
                  : "border-gold/30 text-ink/70 hover:border-gold"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {tagParam && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={clearTag}
              className="inline-flex items-center gap-2 rounded-full border border-gold-dark bg-parchment px-4 py-1.5 text-sm text-gold-dark"
            >
              Stone: {tagParam}
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="mt-16 text-center text-ink/60">No pieces found in this collection yet.</p>
        )}
      </section>
    </div>
  );
}
