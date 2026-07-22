import { Link } from "react-router-dom";
import PlaceholderImage from "./PlaceholderImage";
import { categories, stoneTags, products, formatPrice } from "../data/products";

const featured = products.filter((p) => p.featured).slice(0, 2);

export default function MegaMenu({ onNavigate }) {
  return (
    <div className="absolute left-1/2 top-full z-50 w-[640px] max-w-[90vw] -translate-x-1/2 rounded-b-lg border border-t-0 border-gold/20 bg-ink shadow-xl shadow-black/40">
      <div className="grid grid-cols-3 gap-6 p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-gold-dark">Shop by Category</p>
          <ul className="mt-3 space-y-2">
            {categories.map((cat) => (
              <li key={cat}>
                <Link
                  to={`/products?category=${encodeURIComponent(cat)}`}
                  onClick={onNavigate}
                  className="text-sm text-cream/80 hover:text-gold"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gold-dark">Shop by Stone</p>
          <ul className="mt-3 space-y-2">
            {stoneTags.map((tag) => (
              <li key={tag}>
                <Link
                  to={`/products?tag=${encodeURIComponent(tag)}`}
                  onClick={onNavigate}
                  className="text-sm text-cream/80 hover:text-gold"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gold-dark">Featured</p>
          <div className="mt-3 space-y-3">
            {featured.map((product) => (
              <Link
                key={product.id}
                to={`/products/${product.id}`}
                onClick={onNavigate}
                className="group flex items-center gap-3"
              >
                <PlaceholderImage
                  id={product.id}
                  category={product.category}
                  name={product.name}
                  className="h-12 w-12 shrink-0 rounded"
                />
                <div>
                  <p className="text-sm text-cream group-hover:text-gold">{product.name}</p>
                  <p className="text-xs text-cream/50">{formatPrice(product.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <Link
        to="/products"
        onClick={onNavigate}
        className="block border-t border-gold/15 px-6 py-3 text-center text-xs uppercase tracking-wide text-gold hover:bg-gold/5"
      >
        View All Collections
      </Link>
    </div>
  );
}
