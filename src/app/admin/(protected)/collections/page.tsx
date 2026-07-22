import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { listCollections, getCollectionProductCounts } from "@/lib/data/collections";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { RowActions } from "@/components/admin/row-actions";
import { toggleCollectionActiveAction, deleteCollectionAction } from "./actions";

export const metadata: Metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const [collections, counts] = await Promise.all([listCollections(false), getCollectionProductCounts()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Collections</h1>
          <p className="text-sm text-charcoal/60">Curated groupings of products shown on the homepage and collections page.</p>
        </div>
        <LinkButton href="/admin/collections/new" variant="gold">Add Collection</LinkButton>
      </div>

      <Table>
        <Thead>
          <Th>Image</Th><Th>Name</Th><Th>Slug</Th><Th>Products</Th><Th>Order</Th><Th>Status</Th><Th>Actions</Th>
        </Thead>
        <Tbody>
          {collections.map((c) => (
            <tr key={c.id}>
              <Td>
                <div className="h-10 w-10 overflow-hidden rounded-sm bg-ivory-dark">
                  {c.image_url && <Image src={c.image_url} alt={c.name} width={40} height={40} className="h-10 w-10 object-cover" />}
                </div>
              </Td>
              <Td><Link href={`/admin/collections/${c.id}/edit`} className="font-medium hover:text-gold-dark">{c.name}</Link></Td>
              <Td className="text-charcoal/50">{c.slug}</Td>
              <Td>{counts[c.id] ?? 0}</Td>
              <Td>{c.display_order}</Td>
              <Td><Badge tone={c.is_active ? "green" : "slate"}>{c.is_active ? "Active" : "Inactive"}</Badge></Td>
              <Td>
                <RowActions
                  editHref={`/admin/collections/${c.id}/edit`}
                  isActive={c.is_active}
                  onToggle={toggleCollectionActiveAction.bind(null, c.id)}
                  onDelete={deleteCollectionAction.bind(null, c.id)}
                />
              </Td>
            </tr>
          ))}
        </Tbody>
      </Table>
      {collections.length === 0 && <EmptyState message="No collections yet." />}
    </div>
  );
}
