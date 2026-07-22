import { Link } from "react-router-dom";
import PlaceholderImage from "./PlaceholderImage";
import { formatPrice } from "../data/products";

export default function ProductCard({ product }) {
  return (
    <Link
      to={`/products/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-gold/15 bg-white transition-shadow hover:shadow-lg hover:shadow-gold/10"
    >
      <PlaceholderImage
        id={product.id}
        category={product.category}
        name={product.name}
        className="aspect-square w-full transition-transform duration-500 group-hover:scale-105"
      />
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-gold-dark">{product.category}</p>
        <h3 className="mt-1 font-serif-display text-lg text-ink">{product.name}</h3>
        <p className="mt-1 text-sm text-ink/60">{product.material}</p>
        <p className="mt-3 font-medium text-ink">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
