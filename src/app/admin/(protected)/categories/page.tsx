import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listCategories, getCategoryProductCounts } from "@/lib/data/categories";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { RowActions } from "@/components/admin/row-actions";
import { toggleCategoryActiveAction, deleteCategoryAction } from "./actions";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const [categories, counts] = await Promise.all([listCategories(false), getCategoryProductCounts()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Categories</h1>
          <p className="text-sm text-charcoal/60">Product categories shown across the catalog and navigation.</p>
        </div>
        <LinkButton href="/admin/categories/new" variant="gold">Add Category</LinkButton>
      </div>

      <Table>
        <Thead>
          <Th>Image</Th><Th>Name</Th><Th>Slug</Th><Th>Products</Th><Th>Order</Th><Th>Status</Th><Th>Actions</Th>
        </Thead>
        <Tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <Td>
                <div className="h-10 w-10 overflow-hidden rounded-sm bg-ivory-dark">
                  {c.image_url && <Image src={c.image_url} alt={c.name} width={40} height={40} className="h-10 w-10 object-cover" />}
                </div>
              </Td>
              <Td><Link href={`/admin/categories/${c.id}/edit`} className="font-medium hover:text-gold-dark">{c.name}</Link></Td>
              <Td className="text-charcoal/50">{c.slug}</Td>
              <Td>{counts[c.id] ?? 0}</Td>
              <Td>{c.display_order}</Td>
              <Td><Badge tone={c.is_active ? "green" : "slate"}>{c.is_active ? "Active" : "Inactive"}</Badge></Td>
              <Td>
                <RowActions
                  editHref={`/admin/categories/${c.id}/edit`}
                  isActive={c.is_active}
                  onToggle={toggleCategoryActiveAction.bind(null, c.id)}
                  onDelete={deleteCategoryAction.bind(null, c.id)}
                />
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      {categories.length === 0 && <EmptyState message="No categories yet." />}
    </div>
  );
}
