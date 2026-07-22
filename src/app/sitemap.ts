import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const STATIC_ROUTES = [
  "", "collections", "products", "gold-rates", "gold-calculator", "custom-orders",
  "about", "contact", "privacy-policy", "terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const db = createAdminClient();

  const [{ data: products }, { data: categories }, { data: collections }] = await Promise.all([
    db.from("products").select("slug, updated_at").eq("is_active", true).eq("is_draft", false).is("deleted_at", null),
    db.from("categories").select("slug, updated_at").eq("is_active", true),
    db.from("collections").select("slug, updated_at").eq("is_active", true),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}/${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${siteUrl}/products/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const collectionEntries: MetadataRoute.Sitemap = [...(categories ?? []), ...(collections ?? [])].map((c) => ({
    url: `${siteUrl}/collections/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...productEntries, ...collectionEntries];
}
