import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listProducts } from "@/lib/data/products";
import { listCategories } from "@/lib/data/categories";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { AdminPagination } from "@/components/admin/pagination";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { formatPKR, formatWeight } from "@/lib/utils";
import { computeProductPrice } from "@/lib/pricing/compute";
import { getActiveRateMap } from "@/lib/data/gold-rates";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;

  const [categories, activeRates] = await Promise.all([listCategories(false), getActiveRateMap()]);

  const includeDeleted = params.status === "deleted";
  const { products, total, totalPages } = await listProducts({
    filters: {
      search: params.search,
      categorySlug: params.category,
      includeInactive: true,
      includeDrafts: true,
      includeDeleted,
    },
    page,
    pageSize: 20,
  });

  const visibleProducts = includeDeleted ? products.filter((p) => p.deleted_at) : products.filter((p) => !p.deleted_at);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Products</h1>
          <p className="text-sm text-charcoal/60">{total} total products</p>
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/export/products" className="rounded-sm border border-charcoal/20 px-4 py-2 text-sm hover:bg-charcoal hover:text-ivory">Export CSV</a>
          <LinkButton href="/admin/products/new" variant="gold">Add Product</LinkButton>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-sm border border-charcoal/10 bg-white p-4" method="get">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">Search</label>
          <input name="search" defaultValue={params.search} placeholder="Name, code, description…" className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">Category</label>
          <Select name="category" defaultValue={params.category ?? ""}>
            <option value="">All</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">View</label>
          <Select name="status" defaultValue={params.status ?? ""}>
            <option value="">Active listing</option>
            <option value="deleted">Deleted (trash)</option>
          </Select>
        </div>
        <button type="submit" className="rounded-sm bg-charcoal px-4 py-2 text-sm text-ivory">Filter</button>
      </form>

      {visibleProducts.length === 0 ? (
        <EmptyState message="No products found." />
      ) : (
        <Table>
          <Thead>
            <Th>Image</Th><Th>Product</Th><Th>Category</Th><Th>Purity/Weight</Th><Th>Price</Th><Th>Status</Th><Th>Flags</Th><Th>Actions</Th>
          </Thead>
          <Tbody>
            {visibleProducts.map((p) => {
              const price = computeProductPrice(p, activeRates);
              return (
                <tr key={p.id}>
                  <Td>
                    <div className="h-12 w-12 overflow-hidden rounded-sm bg-ivory-dark">
                      {p.cover_image_url && <Image src={p.cover_image_url} alt={p.name} width={48} height={48} className="h-12 w-12 object-cover" />}
                    </div>
                  </Td>
                  <Td>
                    <Link href={`/admin/products/${p.id}/edit`} className="font-medium hover:text-gold-dark">{p.name}</Link>
                    <p className="text-xs text-charcoal/40">{p.product_code}</p>
                  </Td>
                  <Td>{p.category?.name ?? "—"}</Td>
                  <Td>{p.purity} · {formatWeight(p.gross_weight_grams)}</Td>
                  <Td>{price.visible ? formatPKR(price.finalPrice) : <span className="text-xs text-charcoal/50">{price.label}</span>}</Td>
                  <Td>
                    {p.deleted_at ? <Badge tone="red">Deleted</Badge> : p.is_draft ? <Badge tone="amber">Draft</Badge> : p.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Inactive</Badge>}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      {p.is_featured && <Badge tone="gold">Featured</Badge>}
                      {p.is_new_arrival && <Badge tone="charcoal">New</Badge>}
                    </div>
                  </Td>
                  <Td>
                    <ProductRowActions product={p} />
                  </Td>
                </tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      <AdminPagination page={page} totalPages={totalPages} baseUrl="/admin/products" searchParams={params} />
    </div>
  );
}
