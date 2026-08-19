import "server-only";
import { prisma } from "@/lib/prisma";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  // Settings row is created by the seed script; fall back to schema
  // defaults if it's ever missing so the site never crashes.
  return (
    settings ?? {
      id: "singleton",
      businessName: "Zarghoon Jewellers",
      logoUrl: null,
      address: "Liaquat Bazar Sarafa Market, Quetta, Pakistan",
      phone: "+92 300 0000000",
      whatsapp: "+92 300 0000000",
      email: "info@zarghoonjewellers.com",
      openingHours: "Sat–Thu: 10:00 AM – 9:00 PM",
      decimalPrecision: 2,
      pricingUsesExtras: false,
      currency: "PKR",
      weightUnit: "g",
      defaultPurity: "K21" as const,
      registrationEnabled: true,
      birthdayRemindersEnabled: true,
      requireMarketingConsent: false,
      facebookUrl: null,
      instagramUrl: null,
      whatsappUrl: null,
      youtubeUrl: null,
      tiktokUrl: null,
      notifyBirthdayReminders: true,
      notifyNewCustomer: true,
      notifyNewInquiry: true,
      notifyGoldRateUpdate: false,
      updatedAt: new Date(),
    }
  );
}

export async function getHomepageSettings() {
  return prisma.homepageSettings.findUnique({
    where: { id: "singleton" },
    include: {
      collections: {
        where: { isActive: true },
        include: { category: true },
        orderBy: { sortOrder: "asc" },
      },
      featuredProducts: {
        include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } },
        orderBy: { sortOrder: "asc" },
      },
      banners: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function getActiveCategories() {
  return prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
}
