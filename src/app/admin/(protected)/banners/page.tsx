import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { RowActions } from "@/components/admin/row-actions";
import { toggleBannerActiveAction, deleteBannerAction } from "./actions";
import type { Banner } from "@/types/database";

export const metadata: Metadata = { title: "Banners" };

export default async function BannersPage() {
  const db = createAdminClient();
  const { data } = await db.from("banners").select("*").order("display_order");
  const banners = (data ?? []) as Banner[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Banners</h1>
          <p className="text-sm text-charcoal/60">Promotional banners for the homepage.</p>
        </div>
        <LinkButton href="/admin/banners/new" variant="gold">Add Banner</LinkButton>
      </div>

      {banners.length === 0 ? (
        <EmptyState message="No banners yet." />
      ) : (
        <Table>
          <Thead>
            <Th>Image</Th><Th>Title</Th><Th>Button</Th><Th>Dates</Th><Th>Order</Th><Th>Status</Th><Th>Actions</Th>
          </Thead>
          <Tbody>
            {banners.map((b) => (
              <tr key={b.id}>
                <Td><div className="h-10 w-16 overflow-hidden rounded-sm bg-ivory-dark"><Image src={b.image_url} alt={b.title} width={64} height={40} className="h-10 w-16 object-cover" /></div></Td>
                <Td><Link href={`/admin/banners/${b.id}/edit`} className="font-medium hover:text-gold-dark">{b.title}</Link></Td>
                <Td className="text-xs text-charcoal/50">{b.button_text || "—"}</Td>
                <Td className="text-xs text-charcoal/50">{b.start_date || "Any"} – {b.end_date || "Any"}</Td>
                <Td>{b.display_order}</Td>
                <Td><Badge tone={b.is_active ? "green" : "slate"}>{b.is_active ? "Active" : "Inactive"}</Badge></Td>
                <Td>
                  <RowActions
                    editHref={`/admin/banners/${b.id}/edit`}
                    isActive={b.is_active}
                    onToggle={toggleBannerActiveAction.bind(null, b.id)}
                    onDelete={deleteBannerAction.bind(null, b.id)}
                  />
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
