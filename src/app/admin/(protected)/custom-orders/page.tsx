import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Thead, Th, Tbody, EmptyState } from "@/components/admin/table";
import { AdminPagination } from "@/components/admin/pagination";
import { CustomOrderRow } from "@/components/admin/custom-order-row";
import { Select } from "@/components/ui/input";
import { CUSTOM_ORDER_STATUSES } from "@/lib/constants";
import type { CustomOrder } from "@/types/database";

export const metadata: Metadata = { title: "Custom Orders" };

const PAGE_SIZE = 25;

export default async function CustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const db = createAdminClient();

  let query = db.from("custom_orders").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (params.status) query = query.eq("status", params.status);
  if (params.search) query = query.or(`customer_name.ilike.%${params.search}%,mobile_number.ilike.%${params.search}%,order_number.ilike.%${params.search}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const orders = (data ?? []) as CustomOrder[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-charcoal">Custom Orders</h1>
          <p className="text-sm text-charcoal/60">{count ?? 0} total requests</p>
        </div>
        <a href="/api/admin/export/custom-orders" className="rounded-sm border border-charcoal/20 px-4 py-2 text-sm hover:bg-charcoal hover:text-ivory">Export CSV</a>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-sm border border-charcoal/10 bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">Search</label>
          <input name="search" defaultValue={params.search} placeholder="Name, phone, order #…" className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">Status</label>
          <Select name="status" defaultValue={params.status ?? ""}>
            <option value="">All</option>
            {CUSTOM_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </Select>
        </div>
        <button type="submit" className="rounded-sm bg-charcoal px-4 py-2 text-sm text-ivory">Filter</button>
      </form>

      {orders.length === 0 ? (
        <EmptyState message="No custom orders yet." />
      ) : (
        <Table>
          <Thead>
            <Th>Order</Th><Th>Customer</Th><Th>Details</Th><Th>Design</Th><Th>Status</Th><Th>Notes</Th><Th>Actions</Th>
          </Thead>
          <Tbody>
            {orders.map((o) => <CustomOrderRow key={o.id} order={o} />)}
          </Tbody>
        </Table>
      )}

      <AdminPagination page={page} totalPages={totalPages} baseUrl="/admin/custom-orders" searchParams={params} />
    </div>
  );
}
