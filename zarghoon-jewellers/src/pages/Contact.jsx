import { useState } from "react";
import SectionHeading from "../components/SectionHeading";
import { shop } from "../data/shop";

export default function Contact() {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`Enquiry from ${form.name || "Website Visitor"}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nPhone: ${form.phone}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:${shop.email}?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <div>
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-gold">Get in Touch</p>
          <h1 className="mt-3 font-serif-display text-4xl md:text-5xl">Contact Us</h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Send a Message" title="We'd Love to Hear From You" />
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="text-sm text-ink/70">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gold/25 bg-white px-4 py-3 text-ink outline-none focus:border-gold"
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-sm text-ink/70">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={form.phone}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gold/25 bg-white px-4 py-3 text-ink outline-none focus:border-gold"
              />
            </div>
            <div>
              <label htmlFor="message" className="text-sm text-ink/70">Message</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                required
                value={form.message}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gold/25 bg-white px-4 py-3 text-ink outline-none focus:border-gold"
              />
            </div>
            <button
              type="submit"
              className="rounded-full bg-gold px-6 py-3 text-sm uppercase tracking-wide text-ink transition-colors hover:bg-gold-light"
            >
              Send Message
            </button>
            {sent && (
              <p className="text-sm text-gold-dark">
                Your email app should now be open with your message ready to send.
              </p>
            )}
          </form>
        </div>

        <div>
          <SectionHeading eyebrow="Visit the Store" title="Store Details" />
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-sm uppercase tracking-wide text-gold-dark">Address</h3>
              <p className="mt-1 text-ink/70">{shop.address}</p>
            </div>
            <div>
              <h3 className="text-sm uppercase tracking-wide text-gold-dark">Phone &amp; WhatsApp</h3>
              <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="mt-1 block text-ink/70 hover:text-gold-dark">
                {shop.phone}
              </a>
            </div>
            <div>
              <h3 className="text-sm uppercase tracking-wide text-gold-dark">Email</h3>
              <a href={`mailto:${shop.email}`} className="mt-1 block text-ink/70 hover:text-gold-dark">
                {shop.email}
              </a>
            </div>
            <div>
              <h3 className="text-sm uppercase tracking-wide text-gold-dark">Store Hours</h3>
              <ul className="mt-1 space-y-1 text-ink/70">
                {shop.hours.map((h) => (
                  <li key={h.day} className="flex justify-between gap-4">
                    <span>{h.day}</span>
                    <span>{h.time}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href={`https://wa.me/${shop.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-full border border-gold-dark px-6 py-3 text-sm uppercase tracking-wide text-gold-dark transition-colors hover:bg-gold-dark hover:text-white"
            >
              Chat on WhatsApp
            </a>

            <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-gold/20 bg-parchment text-sm text-ink/40">
              Map location placeholder — add your Google Maps embed here
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
