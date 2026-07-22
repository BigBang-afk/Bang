import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product, ProductImage, ProductWithRelations, Category, Collection } from "@/types/database";

export interface ProductFilters {
  categorySlug?: string;
  collectionSlug?: string;
  purity?: string;
  minWeight?: number;
  maxWeight?: number;
  gender?: string;
  isBridal?: boolean;
  isNewArrival?: boolean;
  isFeatured?: boolean;
  availability?: string;
  search?: string;
  includeInactive?: boolean; // admin only
  includeDrafts?: boolean; // admin only
  includeDeleted?: boolean; // admin only
}

export type ProductSort =
  | "newest"
  | "oldest"
  | "price_low_high"
  | "price_high_low"
  | "weight_low_high"
  | "weight_high_low"
  | "featured"
  | "most_viewed"
  | "most_inquired";

export interface ListProductsOptions {
  filters?: ProductFilters;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface ListProductsResult {
  products: ProductWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function attachRelations(db: ReturnType<typeof createAdminClient>, products: Product[]): Promise<ProductWithRelations[]> {
  if (products.length === 0) return [];
  const productIds = products.map((p) => p.id);
  const categoryIds = [...new Set(products.map((p) => p.category_id).filter(Boolean))] as string[];

  const [{ data: images }, { data: categories }, { data: pc }] = await Promise.all([
    db.from("product_images").select("*").in("product_id", productIds).order("display_order"),
    categoryIds.length
      ? db.from("categories").select("*").in("id", categoryIds)
      : Promise.resolve({ data: [] as Category[] }),
    db.from("product_collections").select("product_id, collections(*)").in("product_id", productIds),
  ]);

  const imagesByProduct = new Map<string, ProductImage[]>();
  for (const img of (images ?? []) as ProductImage[]) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  const categoryById = new Map<string, Category>();
  for (const c of (categories ?? []) as Category[]) categoryById.set(c.id, c);

  const collectionsByProduct = new Map<string, Collection[]>();
  for (const row of (pc ?? []) as unknown as { product_id: string; collections: Collection }[]) {
    const list = collectionsByProduct.get(row.product_id) ?? [];
    if (row.collections) list.push(row.collections);
    collectionsByProduct.set(row.product_id, list);
  }

  return products.map((p) => ({
    ...p,
    category: p.category_id ? categoryById.get(p.category_id) ?? null : null,
    images: imagesByProduct.get(p.id) ?? [],
    collections: collectionsByProduct.get(p.id) ?? [],
  }));
}

export async function listProducts(options: ListProductsOptions = {}): Promise<ListProductsResult> {
  const db = createAdminClient();
  const { filters = {}, sort = "newest", page = 1, pageSize = 12 } = options;

  let query = db.from("products").select("*, categories!inner(*)", { count: "exact" });

  if (!filters.includeDeleted) query = query.is("deleted_at", null);
  if (!filters.includeDrafts) query = query.eq("is_draft", false);
  if (!filters.includeInactive) query = query.eq("is_active", true);

  if (filters.categorySlug) query = query.eq("categories.slug", filters.categorySlug);
  if (filters.purity) query = query.eq("purity", filters.purity);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.isBridal) query = query.eq("is_bridal", true);
  if (filters.isNewArrival) query = query.eq("is_new_arrival", true);
  if (filters.isFeatured) query = query.eq("is_featured", true);
  if (filters.availability) query = query.eq("availability_status", filters.availability);
  if (filters.minWeight !== undefined) query = query.gte("gross_weight_grams", filters.minWeight);
  if (filters.maxWeight !== undefined) query = query.lte("gross_weight_grams", filters.maxWeight);
  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,product_code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "weight_low_high":
      query = query.order("gross_weight_grams", { ascending: true });
      break;
    case "weight_high_low":
      query = query.order("gross_weight_grams", { ascending: false });
      break;
    case "featured":
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "most_viewed":
      query = query.order("view_count", { ascending: false });
      break;
    case "most_inquired":
      query = query.order("inquiry_count", { ascending: false });
      break;
    case "price_low_high":
    case "price_high_low":
      // Automatic price depends on the live gold rate, not a stored column;
      // approximate with gross weight ordering (weight is the price driver
      // for same-purity comparisons) then let the caller re-sort in memory
      // once true prices are calculated if exact ordering is required.
      query = query.order("gross_weight_grams", { ascending: sort === "price_low_high" });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Collection filter requires a join table; handle via a subquery of IDs.
  if (filters.collectionSlug) {
    const { data: collection } = await db
      .from("collections")
      .select("id")
      .eq("slug", filters.collectionSlug)
      .single();
    if (collection) {
      const { data: links } = await db
        .from("product_collections")
        .select("product_id")
        .eq("collection_id", collection.id);
      const ids = (links ?? []).map((l) => l.product_id);
      query = query.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    } else {
      query = query.in("id", ["00000000-0000-0000-0000-000000000000"]);
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const products = await attachRelations(db, (data ?? []) as unknown as Product[]);
  const total = count ?? 0;

  return { products, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getProductBySlug(slug: string, includeInactive = false): Promise<ProductWithRelations | null> {
  const db = createAdminClient();
  let query = db.from("products").select("*").eq("slug", slug).is("deleted_at", null);
  if (!includeInactive) query = query.eq("is_active", true).eq("is_draft", false);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [withRelations] = await attachRelations(db, [data as Product]);
  return withRelations;
}

export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [withRelations] = await attachRelations(db, [data as Product]);
  return withRelations;
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<ProductWithRelations[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("*")
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .eq("is_active", true)
    .eq("is_draft", false)
    .is("deleted_at", null)
    .limit(limit);
  return attachRelations(db, (data ?? []) as Product[]);
}

export async function incrementProductView(productId: string) {
  const db = createAdminClient();
  await db.rpc("increment_product_counter", { p_id: productId, p_column: "view_count" }).then(
    () => {},
    () => {
      // Fallback if the RPC helper isn't present — non-fatal.
    }
  );
}
