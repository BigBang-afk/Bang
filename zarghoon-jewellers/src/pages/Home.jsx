import { Link } from "react-router-dom";
import SectionHeading from "../components/SectionHeading";
import ProductCard from "../components/ProductCard";
import PlaceholderImage from "../components/PlaceholderImage";
import { categories, products } from "../data/products";
import { shop } from "../data/shop";

const featured = products.filter((p) => p.featured).slice(0, 4);

const testimonials = [
  {
    name: "Ayesha K.",
    quote:
      "The Kundan necklace I bought for my wedding was even more beautiful in person. Zarghoon's craftsmanship is unmatched.",
  },
  {
    name: "Bilal R.",
    quote:
      "Three generations of my family have bought jewellery here. The trust and quality have never wavered.",
  },
  {
    name: "Sana M.",
    quote:
      "Excellent service and honest advice on gold purity. They helped me design a custom ring within my budget.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{shop.tagline}</p>
            <h1 className="mt-4 font-serif-display text-4xl leading-tight md:text-6xl">
              Timeless Jewellery,
              <br />
              Crafted for Generations
            </h1>
            <p className="mt-5 max-w-md text-cream/70">
              Zarghoon Jewellers brings you handcrafted gold, diamond, and gemstone pieces
              rooted in tradition and made for life's most precious moments.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="rounded-full bg-gold px-6 py-3 text-sm uppercase tracking-wide text-ink transition-colors hover:bg-gold-light"
              >
                Explore Collections
              </Link>
              <Link
                to="/contact"
                className="rounded-full border border-gold/50 px-6 py-3 text-sm uppercase tracking-wide text-cream transition-colors hover:border-gold"
              >
                Visit Our Store
              </Link>
            </div>
          </div>
          <PlaceholderImage
            id="hero"
            category="Necklaces"
            name="Zarghoon Jewellers"
            className="aspect-[4/5] w-full rounded-lg border border-gold/20"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat}
              to={`/products?category=${encodeURIComponent(cat)}`}
              className="group overflow-hidden rounded-lg border border-gold/15"
            >
              <PlaceholderImage
                id={cat}
                category={cat}
                name={cat}
                className="aspect-square w-full transition-transform duration-500 group-hover:scale-105"
              />
              <p className="bg-white py-3 text-center font-serif-display text-ink">{cat}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured Pieces"
          subtitle="A selection of our most loved designs, chosen for their craftsmanship and timeless appeal."
        />
        <div className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/products"
            className="inline-block rounded-full border border-gold-dark px-6 py-3 text-sm uppercase tracking-wide text-gold-dark transition-colors hover:bg-gold-dark hover:text-white"
          >
            View All Collections
          </Link>
        </div>
      </section>

      <section className="bg-parchment">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2">
          <PlaceholderImage
            id="about-teaser"
            category="Rings"
            name="Our Craft"
            className="aspect-[4/3] w-full rounded-lg"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-dark">Our Story</p>
            <h2 className="mt-2 font-serif-display text-3xl text-ink md:text-4xl">
              A Legacy of Fine Craftsmanship
            </h2>
            <p className="mt-4 text-ink/70">
              For decades, Zarghoon Jewellers has been a trusted name for gold, diamond, and
              gemstone jewellery. Every piece is handcrafted by skilled artisans who blend
              traditional techniques with contemporary design.
            </p>
            <Link
              to="/about"
              className="mt-6 inline-block text-sm uppercase tracking-wide text-gold-dark underline underline-offset-4 hover:text-ink"
            >
              Learn more about us
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <SectionHeading
          eyebrow="Testimonials"
          title="What Our Customers Say"
          center
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-lg border border-gold/15 bg-white p-6">
              <p className="text-gold">★★★★★</p>
              <p className="mt-3 text-ink/70">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-4 font-serif-display text-ink">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center text-cream">
          <h2 className="font-serif-display text-3xl md:text-4xl">
            Visit Zarghoon Jewellers Today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-cream/70">
            Come see our full collection in person, or reach out for a custom design
            consultation.
          </p>
          <Link
            to="/contact"
            className="mt-8 inline-block rounded-full bg-gold px-6 py-3 text-sm uppercase tracking-wide text-ink transition-colors hover:bg-gold-light"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
