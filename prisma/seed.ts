import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function placeholderImage(seed: string, w = 1000, h = 1250) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

async function main() {
  console.log("Seeding Zarghoon Jewellers database…");

  // ── Settings (singleton) ────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  await prisma.homepageSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // ── Admin ────────────────────────────────────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@zarghoonjewellers.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!12345";
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: "Store Administrator",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`  ✓ Admin ready: ${adminEmail} / ${adminPassword}`);

  // ── Categories ───────────────────────────────────────────────────────
  const categoryDefs = [
    { name: "Necklaces", slug: "necklaces" },
    { name: "Bangles", slug: "bangles" },
    { name: "Earrings", slug: "earrings" },
    { name: "Rings", slug: "rings" },
    { name: "Bracelets", slug: "bracelets" },
    { name: "Pendants", slug: "pendants" },
    { name: "Chains", slug: "chains" },
    { name: "Sets", slug: "sets" },
    { name: "Bridal Collection", slug: "bridal-collection" },
    { name: "Men's Jewellery", slug: "mens-jewellery" },
    { name: "Kids Jewellery", slug: "kids-jewellery" },
    { name: "New Arrivals", slug: "new-arrivals" },
  ];

  const categories: Record<string, string> = {};
  for (let i = 0; i < categoryDefs.length; i++) {
    const def = categoryDefs[i];
    const cat = await prisma.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        name: def.name,
        slug: def.slug,
        imageUrl: placeholderImage(`category-${def.slug}`, 800, 800),
        sortOrder: i,
        description: `Explore our exquisite ${def.name.toLowerCase()} collection, crafted in pure gold.`,
      },
    });
    categories[def.slug] = cat.id;
  }
  console.log(`  ✓ ${categoryDefs.length} categories ready`);

  // ── Gold rates (initial history) ────────────────────────────────────
  const now = new Date();
  const rateSeed: { purity: "K24" | "K21" | "K18"; rate: number }[] = [
    { purity: "K24", rate: 29500 },
    { purity: "K21", rate: 25800 },
    { purity: "K18", rate: 22100 },
  ];
  for (const r of rateSeed) {
    const existing = await prisma.goldRate.findFirst({ where: { purity: r.purity } });
    if (!existing) {
      await prisma.goldRate.create({
        data: {
          purity: r.purity,
          ratePerGram: r.rate,
          effectiveAt: now,
          notes: "Initial seeded rate",
          updatedByAdminId: admin.id,
        },
      });
    }
  }
  console.log("  ✓ Gold rates seeded (24K/21K/18K)");

  // ── Products ─────────────────────────────────────────────────────────
  const productDefs = [
    {
      name: "Zarghoon Bridal Kundan Necklace Set",
      sku: "ZJ-NK-1001",
      categorySlug: "bridal-collection",
      purity: "K21" as const,
      grossWeight: 42.5,
      netGoldWeight: 40.1,
      stoneWeight: 2.4,
      isFeatured: true,
      isBestseller: true,
      description:
        "A magnificent bridal necklace set finished with hand-set Kundan work, designed for the modern Pakistani bride.",
    },
    {
      name: "Royal Maroon Polki Choker",
      sku: "ZJ-NK-1002",
      categorySlug: "necklaces",
      purity: "K21" as const,
      grossWeight: 28.2,
      netGoldWeight: 26.8,
      stoneWeight: 1.1,
      isNewArrival: true,
      description: "An elegant polki choker with intricate gold filigree work.",
    },
    {
      name: "Classic Gold Kada Bangles (Pair)",
      sku: "ZJ-BG-2001",
      categorySlug: "bangles",
      purity: "K24" as const,
      grossWeight: 35.0,
      netGoldWeight: 35.0,
      stoneWeight: 0,
      isBestseller: true,
      description: "Timeless 24K gold kada bangles, sold as a matching pair.",
    },
    {
      name: "Meena Work Bangles Set",
      sku: "ZJ-BG-2002",
      categorySlug: "bangles",
      purity: "K21" as const,
      grossWeight: 22.6,
      netGoldWeight: 21.0,
      stoneWeight: 0.6,
      description: "Hand-enamelled meena work bangle set in champagne gold tones.",
    },
    {
      name: "Jhumka Drop Earrings",
      sku: "ZJ-ER-3001",
      categorySlug: "earrings",
      purity: "K21" as const,
      grossWeight: 9.8,
      netGoldWeight: 9.2,
      stoneWeight: 0.3,
      isNewArrival: true,
      description: "Traditional jhumka earrings with delicate gold beadwork.",
    },
    {
      name: "Solitaire Halo Engagement Ring",
      sku: "ZJ-RG-4001",
      categorySlug: "rings",
      purity: "K18" as const,
      grossWeight: 5.4,
      netGoldWeight: 4.9,
      stoneWeight: 0.4,
      isFeatured: true,
      description: "An 18K gold engagement ring with a brilliant halo setting.",
    },
    {
      name: "Men's Textured Gold Band",
      sku: "ZJ-RG-4002",
      categorySlug: "mens-jewellery",
      purity: "K21" as const,
      grossWeight: 8.6,
      netGoldWeight: 8.6,
      stoneWeight: 0,
      description: "A bold, brushed-texture gold band for men.",
    },
    {
      name: "Rope Chain — 22 inch",
      sku: "ZJ-CH-5001",
      categorySlug: "chains",
      purity: "K21" as const,
      grossWeight: 15.3,
      netGoldWeight: 15.3,
      stoneWeight: 0,
      isBestseller: true,
      description: "A classic rope-link chain, 22 inches, in polished gold.",
    },
    {
      name: "Kids Evil-Eye Pendant",
      sku: "ZJ-PD-6001",
      categorySlug: "kids-jewellery",
      purity: "K18" as const,
      grossWeight: 2.1,
      netGoldWeight: 2.0,
      stoneWeight: 0.1,
      isNewArrival: true,
      description: "A delicate protective pendant, sized for children.",
    },
    {
      name: "Layered Tennis Bracelet",
      sku: "ZJ-BR-7001",
      categorySlug: "bracelets",
      purity: "K18" as const,
      grossWeight: 11.2,
      netGoldWeight: 10.0,
      stoneWeight: 1.2,
      description: "A refined layered bracelet with pave stone detailing.",
    },
  ];

  for (const p of productDefs) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) continue;
    const product = await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        categoryId: categories[p.categorySlug],
        description: p.description,
        purity: p.purity,
        grossWeight: p.grossWeight,
        netGoldWeight: p.netGoldWeight,
        stoneWeight: p.stoneWeight,
        makingCharges: Math.round(p.grossWeight * 800),
        status: "PUBLISHED",
        isFeatured: p.isFeatured ?? false,
        isNewArrival: p.isNewArrival ?? false,
        isBestseller: p.isBestseller ?? false,
      },
    });
    await prisma.productImage.createMany({
      data: [0, 1, 2].map((i) => ({
        productId: product.id,
        url: placeholderImage(`${p.sku}-${i}`),
        altText: p.name,
        sortOrder: i,
        isPrimary: i === 0,
      })),
    });
  }
  console.log(`  ✓ ${productDefs.length} products ready`);

  // ── Featured products on homepage ───────────────────────────────────
  const featured = await prisma.product.findMany({ where: { isFeatured: true }, take: 6 });
  for (let i = 0; i < featured.length; i++) {
    await prisma.homepageFeaturedProduct.upsert({
      where: {
        homepageSettingsId_productId: {
          homepageSettingsId: "singleton",
          productId: featured[i].id,
        },
      },
      update: { sortOrder: i },
      create: { homepageSettingsId: "singleton", productId: featured[i].id, sortOrder: i },
    });
  }

  const homeCollectionSlugs = ["bridal-collection", "necklaces", "bangles", "rings", "earrings", "chains"];
  for (let i = 0; i < homeCollectionSlugs.length; i++) {
    const categoryId = categories[homeCollectionSlugs[i]];
    await prisma.homepageCollection.upsert({
      where: { homepageSettingsId_categoryId: { homepageSettingsId: "singleton", categoryId } },
      update: { sortOrder: i },
      create: { homepageSettingsId: "singleton", categoryId, sortOrder: i },
    });
  }

  await prisma.banner.deleteMany({});
  await prisma.banner.create({
    data: {
      homepageSettingsId: "singleton",
      imageUrl: placeholderImage("promo-banner", 1600, 700),
      heading: "The Bridal Edit",
      description: "Handcrafted bridal sets for your most treasured moments.",
      buttonText: "View Bridal Collection",
      buttonUrl: "/collections/bridal-collection",
      sortOrder: 0,
    },
  });

  // ── Gallery ──────────────────────────────────────────────────────────
  const galleryCategories: { title: string; category: "SHOWROOM" | "JEWELLERY" | "EVENTS" | "BRIDAL" | "CUSTOMERS" | "COLLECTIONS" }[] = [
    { title: "Our Showroom in Liaquat Bazar", category: "SHOWROOM" },
    { title: "Bridal Showcase", category: "BRIDAL" },
    { title: "Craftsmanship", category: "JEWELLERY" },
    { title: "Eid Collection Launch", category: "EVENTS" },
    { title: "New Arrivals Display", category: "COLLECTIONS" },
    { title: "Happy Customers", category: "CUSTOMERS" },
  ];
  for (let i = 0; i < galleryCategories.length; i++) {
    const g = galleryCategories[i];
    const found = await prisma.galleryItem.findFirst({ where: { title: g.title } });
    if (!found) {
      await prisma.galleryItem.create({
        data: {
          title: g.title,
          category: g.category,
          imageUrl: placeholderImage(`gallery-${i}`, 1000, 750),
          sortOrder: i,
        },
      });
    }
  }
  console.log("  ✓ Gallery items ready");

  // ── Customers (with varied birthdays for testing the reminder system) ─
  const today = new Date();
  const customerDefs = [
    { fullName: "Ahmed Khan", mobile: "+923001234567", dobOffsetDays: 0, type: "VIP" as const },
    { fullName: "Sara Baloch", mobile: "+923011234567", dobOffsetDays: 3, type: "REGULAR" as const },
    { fullName: "Bilal Achakzai", mobile: "+923021234567", dobOffsetDays: 20, type: "REGULAR" as const },
    { fullName: "Fatima Raisani", mobile: "+923031234567", dobOffsetDays: 65, type: "VIP" as const },
    { fullName: "Hamza Marri", mobile: "+923041234567", dobOffsetDays: 200, type: "REGULAR" as const },
    { fullName: "Ayesha Kakar", mobile: "+923051234567", dobOffsetDays: -400, type: "REGULAR" as const },
  ];

  const customerPasswordHash = await bcrypt.hash("Customer@123", 12);
  const customers: string[] = [];
  for (const c of customerDefs) {
    const dob = new Date(today);
    dob.setFullYear(dob.getFullYear() - (25 + Math.floor(Math.random() * 15)));
    dob.setDate(dob.getDate() + c.dobOffsetDays);

    const customer = await prisma.customer.upsert({
      where: { mobile: c.mobile },
      update: {},
      create: {
        fullName: c.fullName,
        mobile: c.mobile,
        dob,
        email: `${c.fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        passwordHash: customerPasswordHash,
        customerType: c.type,
        marketingConsent: true,
      },
    });
    customers.push(customer.id);
  }
  console.log(`  ✓ ${customerDefs.length} sample customers ready (password: Customer@123)`);

  // ── Message templates ───────────────────────────────────────────────
  const templateDefs = [
    {
      name: "Birthday Wishes",
      type: "BIRTHDAY" as const,
      channel: "SMS" as const,
      body: "Dear {customer_name}, {store_name} wishes you a very Happy Birthday! 🎂✨ May your special day be filled with happiness, prosperity and beautiful moments. Thank you for being a valued customer.",
    },
    {
      name: "New Collection Announcement",
      type: "NEW_COLLECTION" as const,
      channel: "SMS" as const,
      body: "Dear {customer_name}, our new collection has just arrived at {store_name}! Visit us today to explore timeless pieces crafted in pure gold. Call {phone} for details.",
    },
    {
      name: "Gold Rate Update",
      type: "GOLD_RATE_UPDATE" as const,
      channel: "SMS" as const,
      body: "Dear {customer_name}, today's gold rate at {store_name} is PKR {gold_rate}/gram. Visit us in Liaquat Bazar Sarafa Market, Quetta. Date: {date}.",
    },
    {
      name: "Special Offer",
      type: "SPECIAL_OFFER" as const,
      channel: "SMS" as const,
      body: "Dear {customer_name}, enjoy an exclusive special offer this week only at {store_name}! Visit us or call {phone} to learn more.",
    },
    {
      name: "Festival Greetings",
      type: "FESTIVAL" as const,
      channel: "SMS" as const,
      body: "Dear {customer_name}, warm festival greetings from all of us at {store_name}! Wishing you and your family joy and prosperity.",
    },
    {
      name: "Store Announcement",
      type: "ANNOUNCEMENT" as const,
      channel: "SMS" as const,
      body: "Dear {customer_name}, an important update from {store_name}: please visit us or call {phone} for the latest news.",
    },
  ];
  for (const t of templateDefs) {
    const found = await prisma.messageTemplate.findFirst({ where: { name: t.name } });
    if (!found) {
      await prisma.messageTemplate.create({ data: t });
    }
  }
  console.log(`  ✓ ${templateDefs.length} message templates ready`);

  // ── A sample inquiry/order ──────────────────────────────────────────
  const sampleProduct = await prisma.product.findFirst({ where: { sku: "ZJ-RG-4001" } });
  const sampleRate = await prisma.goldRate.findFirst({ where: { purity: "K18" }, orderBy: { effectiveAt: "desc" } });
  if (sampleProduct && sampleRate && customers[0]) {
    const existingOrder = await prisma.order.findFirst({ where: { orderNumber: "ZJ-SEED-0001" } });
    if (!existingOrder) {
      const goldValue = Number(sampleProduct.grossWeight) * Number(sampleRate.ratePerGram);
      await prisma.order.create({
        data: {
          orderNumber: "ZJ-SEED-0001",
          customerId: customers[0],
          status: "NEW",
          notes: "Customer inquired via WhatsApp about ring resizing.",
          items: {
            create: [
              {
                productId: sampleProduct.id,
                productNameAtOrder: sampleProduct.name,
                purityAtOrder: sampleProduct.purity,
                grossWeightAtOrder: sampleProduct.grossWeight,
                goldRateId: sampleRate.id,
                goldRatePerGramAtOrder: sampleRate.ratePerGram,
                finalPriceAtOrder: goldValue,
              },
            ],
          },
        },
      });
    }
  }

  console.log("\nSeed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
