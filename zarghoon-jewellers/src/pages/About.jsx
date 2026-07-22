import SectionHeading from "../components/SectionHeading";
import { Link } from "react-router-dom";
import goldsmith from "../assets/photos/goldsmith.jpg";

const values = [
  {
    title: "Certified Purity",
    body: "Every gold piece is hallmarked and every gemstone certified, so you always know exactly what you're buying.",
  },
  {
    title: "Handcrafted Artistry",
    body: "Our master artisans combine generations-old techniques with modern design sensibilities in every piece.",
  },
  {
    title: "Honest Pricing",
    body: "Transparent making charges and daily gold rates — no surprises, no pressure.",
  },
  {
    title: "Custom Design",
    body: "From engagement rings to bridal sets, we bring your vision to life with personalized consultations.",
  },
];

export default function About() {
  return (
    <div>
      <section className="bg-ink-radial text-cream">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">About Us</p>
          <h1 className="mt-3 font-serif-display text-4xl md:text-5xl">
            <span className="text-gold-gradient">Our Story</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg shadow-gold-glow">
          <img
            src={goldsmith}
            alt="Goldsmith hand-finishing a gold jewellery piece — placeholder stock photography"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <SectionHeading eyebrow="Since Generations" title="Rooted in Tradition, Made for Today" />
          <p className="mt-4 text-ink/70">
            Zarghoon Jewellers began as a small family workshop with a simple promise: honest
            craftsmanship and jewellery worth passing down. Today, that promise remains at the
            heart of everything we make.
          </p>
          <p className="mt-4 text-ink/70">
            Each piece that leaves our workshop is shaped by hand, checked for quality at every
            stage, and finished by artisans who take pride in their craft. Whether it's a
            bridal set for a wedding day or a simple gift for someone you love, we treat every
            order with the same care.
          </p>
        </div>
      </section>

      <section className="bg-parchment">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <SectionHeading eyebrow="Why Choose Us" title="What We Stand For" center />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-lg border border-gold/15 bg-white p-6 transition-shadow hover:shadow-gold-glow"
              >
                <h3 className="font-serif-display text-lg text-ink">{v.title}</h3>
                <p className="mt-2 text-sm text-ink/60">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h2 className="font-serif-display text-3xl text-ink md:text-4xl">
          Ready to Find Your Piece?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-ink/60">
          Browse our collections online, or visit the store for a personal consultation with
          our team.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/products"
            className="rounded-full bg-gold-gradient px-6 py-3 text-sm uppercase tracking-wide text-ink shadow-gold-glow transition-transform hover:scale-105"
          >
            Explore Collections
          </Link>
          <Link
            to="/contact"
            className="rounded-full border border-gold-dark px-6 py-3 text-sm uppercase tracking-wide text-gold-dark transition-colors hover:bg-gold-dark hover:text-white"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
