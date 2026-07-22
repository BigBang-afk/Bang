import { Link } from "react-router-dom";
import { shop } from "../data/shop";

export default function Footer() {
  return (
    <footer className="border-t border-gold/20 bg-ink text-cream/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <h3 className="font-serif-display text-lg text-gold">{shop.name}</h3>
          <p className="mt-3 text-sm leading-relaxed">
            Handcrafted gold, diamond, and gemstone jewellery — trusted by families for
            generations, made for life's most cherished moments.
          </p>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-wide text-gold">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/" className="hover:text-gold">Home</Link></li>
            <li><Link to="/products" className="hover:text-gold">Collections</Link></li>
            <li><Link to="/about" className="hover:text-gold">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-wide text-gold">Visit Us</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>{shop.address}</li>
            <li>
              <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="hover:text-gold">
                {shop.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${shop.email}`} className="hover:text-gold">
                {shop.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gold/10 px-6 py-5 text-center text-xs text-cream/40">
        © {new Date().getFullYear()} {shop.name}. All rights reserved.
      </div>
    </footer>
  );
}
