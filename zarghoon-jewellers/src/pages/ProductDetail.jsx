import { Link, Navigate, useParams } from "react-router-dom";
import PlaceholderImage from "../components/PlaceholderImage";
import ProductCard from "../components/ProductCard";
import { formatPrice, getProductById, getRelatedProducts } from "../data/products";
import { shop } from "../data/shop";

export default function ProductDetail() {
  const { id } = useParams();
  const product = getProductById(id);

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  const related = getRelatedProducts(product);
  const whatsappMessage = encodeURIComponent(
    `Hi, I'm interested in the ${product.name} (${formatPrice(product.price)}).`
  );

  return (
    <div>
      <div className="mx-auto max-w-6xl px-6 pt-6 text-sm text-ink/50">
        <Link to="/products" className="hover:text-gold-dark">Collections</Link>
        <span className="mx-2">/</span>
        <span>{product.category}</span>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </div>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-10 md:grid-cols-2">
        <PlaceholderImage
          id={product.id}
          category={product.category}
          name={product.name}
          className="aspect-square w-full rounded-lg border border-gold/15"
        />

        <div>
          <p className="text-xs uppercase tracking-wide text-gold-dark">{product.category}</p>
          <h1 className="mt-2 font-serif-display text-3xl text-ink md:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-2xl text-ink">{formatPrice(product.price)}</p>
          <p className="mt-1 text-sm text-ink/50">Price may vary with daily gold rate</p>

          <p className="mt-6 leading-relaxed text-ink/70">{product.description}</p>

          <dl className="mt-6 space-y-2 border-t border-gold/15 pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink/50">Material</dt>
              <dd className="text-ink">{product.material}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink/50">Category</dt>
              <dd className="text-ink">{product.category}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href={`https://wa.me/${shop.whatsapp}?text=${whatsappMessage}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gold px-6 py-3 text-sm uppercase tracking-wide text-ink transition-colors hover:bg-gold-light"
            >
              Enquire on WhatsApp
            </a>
            <Link
              to="/contact"
              className="rounded-full border border-gold-dark px-6 py-3 text-sm uppercase tracking-wide text-gold-dark transition-colors hover:bg-gold-dark hover:text-white"
            >
              Visit Store
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-parchment">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="font-serif-display text-2xl text-ink">You May Also Like</h2>
            <div className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
