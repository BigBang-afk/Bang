import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Thead, Th, Tbody, EmptyState } from "@/components/admin/table";
import { AdminPagination } from "@/components/admin/pagination";
import { InquiryRow } from "@/components/admin/inquiry-row";
import { Select } from "@/components/ui/input";
import { INQUIRY_STATUSES } from "@/lib/constants";
import type { Inquiry } from "@/types/database";

export const metadata: Metadata = { title: "Customer Inquiries" };

const PAGE_SIZE = 25;

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const db = createAdminClient();

  let query = db.from("inquiries").select("*, products(name)", { count: "exact" }).order("created_at", { ascending: false });
  if (params.status) query = query.eq("status", params.status);
  if (params.search) query = query.or(`customer_name.ilike.%${params.search}%,mobile_number.ilike.%${params.search}%,inquiry_number.ilike.%${params.search}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const inquiries = (data ?? []) as unknown as (Inquiry & { products: { name: string } | null })[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Customer Inquiries</h1>
          <p className="text-sm text-charcoal/60">{count ?? 0} total inquiries</p>
        </div>
        <a href="/api/admin/export/inquiries" className="rounded-sm border border-charcoal/20 px-4 py-2 text-sm hover:bg-charcoal hover:text-ivory">Export CSV</a>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-sm border border-charcoal/10 bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">Search</label>
          <input name="search" defaultValue={params.search} placeholder="Name, phone, inquiry #…" className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">Status</label>
          <Select name="status" defaultValue={params.status ?? ""}>
            <option value="">All</option>
            {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </Select>
        </div>
        <button type="submit" className="rounded-sm bg-charcoal px-4 py-2 text-sm text-ivory">Filter</button>
      </form>

      {inquiries.length === 0 ? (
        <EmptyState message="No inquiries yet." />
      ) : (
        <Table>
          <Thead>
            <Th>Inquiry</Th><Th>Customer</Th><Th>Product</Th><Th>Message</Th><Th>Status</Th><Th>Notes</Th><Th>Actions</Th>
          </Thead>
          <Tbody>
            {inquiries.map((i) => <InquiryRow key={i.id} inquiry={i} productName={i.products?.name ?? null} />)}
          </Tbody>
        </Table>
      )}

      <AdminPagination page={page} totalPages={totalPages} baseUrl="/admin/inquiries" searchParams={params} />
    </div>
  );
}
