import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { categories, products } from "../data/products";

const ALL = "All";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [active, setActive] = useState(
    categories.includes(categoryParam) ? categoryParam : ALL
  );

  const filtered = useMemo(
    () => (active === ALL ? products : products.filter((p) => p.category === active)),
    [active]
  );

  function handleSelect(cat) {
    setActive(cat);
    if (cat === ALL) {
      searchParams.delete("category");
    } else {
      searchParams.set("category", cat);
    }
    setSearchParams(searchParams, { replace: true });
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
              onClick={() => handleSelect(cat)}
              className={`rounded-full border px-5 py-2 text-sm uppercase tracking-wide transition-colors ${
                active === cat
                  ? "border-gold bg-gold text-ink"
                  : "border-gold/30 text-ink/70 hover:border-gold"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

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
