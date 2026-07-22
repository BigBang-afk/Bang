import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { TestimonialRowActions } from "@/components/admin/testimonial-row-actions";
import { Star } from "lucide-react";
import type { Testimonial } from "@/types/database";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const db = createAdminClient();
  const { data } = await db.from("testimonials").select("*").order("display_order").order("created_at", { ascending: false });
  const testimonials = (data ?? []) as Testimonial[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Testimonials</h1>
          <p className="text-sm text-charcoal/60">Only approved testimonials appear on the public site.</p>
        </div>
        <LinkButton href="/admin/testimonials/new" variant="gold">Add Testimonial</LinkButton>
      </div>

      {testimonials.length === 0 ? (
        <EmptyState message="No testimonials yet." />
      ) : (
        <Table>
          <Thead>
            <Th>Customer</Th><Th>Rating</Th><Th>Review</Th><Th>Status</Th><Th>Featured</Th><Th>Actions</Th>
          </Thead>
          <Tbody>
            {testimonials.map((t) => (
              <tr key={t.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    {t.customer_image_url ? (
                      <Image src={t.customer_image_url} alt={t.customer_name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ivory-dark text-xs">{t.customer_name.charAt(0)}</div>
                    )}
                    <Link href={`/admin/testimonials/${t.id}/edit`} className="font-medium hover:text-gold-dark">{t.customer_name}</Link>
                  </div>
                </Td>
                <Td>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className={i < t.rating ? "fill-gold text-gold" : "text-charcoal/15"} />)}
                  </div>
                </Td>
                <Td className="max-w-[280px]"><p className="line-clamp-2 text-xs text-charcoal/60">{t.review}</p></Td>
                <Td><Badge tone={t.is_approved ? "green" : "amber"}>{t.is_approved ? "Approved" : "Pending"}</Badge></Td>
                <Td><Badge tone={t.is_featured ? "gold" : "slate"}>{t.is_featured ? "Featured" : "—"}</Badge></Td>
                <Td><TestimonialRowActions testimonial={t} /></Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
