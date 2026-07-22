export const categories = ["Rings", "Necklaces", "Earrings", "Bangles"];

export const products = [
  {
    id: "royal-halo-ring",
    name: "Royal Halo Ring",
    category: "Rings",
    price: 185000,
    material: "22K Gold, Diamond Halo",
    featured: true,
    description:
      "A brilliant center stone encircled by a halo of pavé diamonds, set in warm 22K gold. A timeless choice for engagements and anniversaries.",
  },
  {
    id: "twin-leaf-band",
    name: "Twin Leaf Band",
    category: "Rings",
    price: 96000,
    material: "21K Gold",
    featured: false,
    description:
      "Delicate hand-engraved leaf motifs wrap around a comfort-fit band, finished with a soft polished glow.",
  },
  {
    id: "emerald-solitaire-ring",
    name: "Emerald Solitaire Ring",
    category: "Rings",
    price: 245000,
    material: "18K Gold, Natural Emerald",
    featured: true,
    description:
      "A deep-green natural emerald takes center stage on a sleek 18K gold band, framed by a thin diamond border.",
  },
  {
    id: "vintage-rose-ring",
    name: "Vintage Rose Ring",
    category: "Rings",
    price: 112000,
    material: "22K Gold",
    featured: false,
    description:
      "Inspired by heritage motifs, this ring features intricate rose filigree work true to classic Zarghoon craftsmanship.",
  },
  {
    id: "heritage-kundan-necklace",
    name: "Heritage Kundan Necklace",
    category: "Necklaces",
    price: 420000,
    material: "22K Gold, Kundan Stones",
    featured: true,
    description:
      "A statement bridal necklace featuring traditional Kundan stone-setting and hand-finished gold work, passed down in style for generations.",
  },
  {
    id: "cascade-diamond-necklace",
    name: "Cascade Diamond Necklace",
    category: "Necklaces",
    price: 365000,
    material: "18K White Gold, Diamonds",
    featured: true,
    description:
      "Graduated diamonds cascade along a delicate white gold chain for a look that moves effortlessly from day to evening.",
  },
  {
    id: "layered-chain-necklace",
    name: "Layered Chain Necklace",
    category: "Necklaces",
    price: 138000,
    material: "21K Gold",
    featured: false,
    description:
      "Three finely layered chains of varying lengths create a modern, versatile piece that pairs with everything.",
  },
  {
    id: "pearl-drop-necklace",
    name: "Pearl Drop Necklace",
    category: "Necklaces",
    price: 156000,
    material: "18K Gold, Freshwater Pearl",
    featured: false,
    description:
      "A single luminous freshwater pearl suspended from a fine gold chain — understated elegance for everyday wear.",
  },
  {
    id: "chandelier-earrings",
    name: "Chandelier Earrings",
    category: "Earrings",
    price: 175000,
    material: "22K Gold, Ruby Accents",
    featured: true,
    description:
      "Cascading tiers of gold and ruby create dramatic movement — a showpiece for weddings and celebrations.",
  },
  {
    id: "classic-hoop-earrings",
    name: "Classic Gold Hoops",
    category: "Earrings",
    price: 68000,
    material: "21K Gold",
    featured: false,
    description:
      "Perfectly weighted hoops with a mirror-polish finish, designed for everyday elegance.",
  },
  {
    id: "diamond-stud-earrings",
    name: "Diamond Stud Earrings",
    category: "Earrings",
    price: 132000,
    material: "18K Gold, Diamond",
    featured: false,
    description:
      "Brilliant-cut diamonds set in a classic four-prong mount — a wardrobe essential that never goes out of style.",
  },
  {
    id: "jhumka-earrings",
    name: "Traditional Jhumka Earrings",
    category: "Earrings",
    price: 98000,
    material: "22K Gold",
    featured: true,
    description:
      "Intricately domed jhumkas with fine bead detailing, handcrafted by our master artisans in the traditional style.",
  },
  {
    id: "engraved-kada-bangle",
    name: "Engraved Kada Bangle",
    category: "Bangles",
    price: 210000,
    material: "22K Gold",
    featured: true,
    description:
      "A bold, solid kada with hand-engraved geometric patterns — substantial, striking, and built to last generations.",
  },
  {
    id: "stackable-bangle-set",
    name: "Stackable Bangle Set (Set of 4)",
    category: "Bangles",
    price: 265000,
    material: "21K Gold",
    featured: false,
    description:
      "Four slim bangles designed to be worn together or separately, each with a subtly different textured finish.",
  },
  {
    id: "gemstone-cuff-bangle",
    name: "Gemstone Cuff Bangle",
    category: "Bangles",
    price: 188000,
    material: "18K Gold, Mixed Gemstones",
    featured: false,
    description:
      "An open cuff bangle set with a colorful row of natural gemstones for a modern, expressive statement.",
  },
  {
    id: "filigree-bangle",
    name: "Filigree Openwork Bangle",
    category: "Bangles",
    price: 142000,
    material: "22K Gold",
    featured: false,
    description:
      "Lacelike openwork filigree gives this bangle a light, airy feel without compromising on gold weight.",
  },
];

export function getProductById(id) {
  return products.find((p) => p.id === id);
}

export function getRelatedProducts(product, count = 4) {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, count);
}

export function formatPrice(price) {
  return `Rs ${price.toLocaleString("en-PK")}`;
}
