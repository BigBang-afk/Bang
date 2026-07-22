import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Thead, Th, Tbody, EmptyState } from "@/components/admin/table";
import { AdminPagination } from "@/components/admin/pagination";
import { ContactMessageRow } from "@/components/admin/contact-message-row";
import type { ContactMessage } from "@/types/database";

export const metadata: Metadata = { title: "Contact Messages" };

const PAGE_SIZE = 25;

export default async function ContactMessagesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam ?? "1", 10) || 1;
  const db = createAdminClient();

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await db
    .from("contact_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const messages = (data ?? []) as ContactMessage[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Contact Messages</h1>
        <p className="text-sm text-charcoal/60">{count ?? 0} total messages</p>
      </div>

      {messages.length === 0 ? (
        <EmptyState message="No contact messages yet." />
      ) : (
        <Table>
          <Thead>
            <Th>Name</Th><Th>Contact</Th><Th>Subject</Th><Th>Message</Th><Th>Status</Th><Th>Actions</Th>
          </Thead>
          <Tbody>
            {messages.map((m) => <ContactMessageRow key={m.id} message={m} />)}
          </Tbody>
        </Table>
      )}

      <AdminPagination page={page} totalPages={totalPages} baseUrl="/admin/contact-messages" />
    </div>
  );
}
