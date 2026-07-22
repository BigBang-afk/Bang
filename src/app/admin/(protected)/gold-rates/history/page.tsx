import type { Metadata } from "next";
import { getGoldRateHistory } from "@/lib/data/gold-rates";
import { GoldRateLineChart } from "@/components/admin/charts";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPKR, formatTime } from "@/lib/utils";
import { GOLD_PURITIES } from "@/lib/constants";
import { Select } from "@/components/ui/input";

export const metadata: Metadata = { title: "Gold Rate History" };

export default async function GoldRateHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ purity?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const purity = params.purity && GOLD_PURITIES.includes(params.purity as never) ? params.purity : "24K";

  const history = await getGoldRateHistory({ purity, from: params.from, to: params.to, limit: 100 });
  const chartData = history.slice().reverse().map((h) => ({ date: h.effective_date, ratePerGram: parseFloat(h.rate_per_gram) }));

  const exportUrl = `/api/admin/export/gold-rate-history?purity=${purity}${params.from ? `&from=${params.from}` : ""}${params.to ? `&to=${params.to}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-charcoal">Gold Rate History</h1>
        <a href={exportUrl} className="rounded-sm border border-charcoal/20 px-4 py-2 text-sm hover:bg-charcoal hover:text-ivory">
          Export CSV
        </a>
      </div>

      <Card>
        <CardBody>
          <form className="flex flex-wrap items-end gap-4" method="get">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">Purity</label>
              <Select name="purity" defaultValue={purity}>
                {GOLD_PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">From</label>
              <input type="date" name="from" defaultValue={params.from} className="rounded-sm border border-charcoal/20 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wide text-charcoal/60">To</label>
              <input type="date" name="to" defaultValue={params.to} className="rounded-sm border border-charcoal/20 px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="rounded-sm bg-charcoal px-4 py-2 text-sm text-ivory">Filter</button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-serif text-lg">{purity} Rate Trend</h2></CardHeader>
        <CardBody><GoldRateLineChart data={chartData} /></CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {history.length === 0 ? (
            <EmptyState message="No rate history for this filter yet." />
          ) : (
            <Table>
              <Thead>
                <Th>Date</Th><Th>Time</Th><Th>Rate/Tola</Th><Th>Rate/Gram</Th><Th>Change</Th><Th>Source</Th><Th>Type</Th>
              </Thead>
              <Tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <Td>{formatDate(h.effective_date)}</Td>
                    <Td>{formatTime(`${h.effective_date}T${h.effective_time}`)}</Td>
                    <Td>{formatPKR(h.rate_per_tola)}</Td>
                    <Td>{formatPKR(h.rate_per_gram)}</Td>
                    <Td className={parseFloat(h.rate_change) >= 0 ? "text-green-700" : "text-red-700"}>
                      {parseFloat(h.rate_change) >= 0 ? "+" : ""}{formatPKR(h.rate_change)} ({h.percentage_change}%)
                    </Td>
                    <Td>{h.rate_source}</Td>
                    <Td><Badge tone={h.is_manual ? "slate" : "green"}>{h.is_manual ? "Manual" : "API"}</Badge></Td>
                  </tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
