import { requireAdmin } from "@/lib/auth";
import { getGoldRateHistory } from "@/lib/data/gold-rates";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: Request) {
  await requireAdmin();

  const { searchParams } = new URL(request.url);
  const history = await getGoldRateHistory({
    purity: searchParams.get("purity") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    limit: 5000,
  });

  const csv = toCsv(history as unknown as Record<string, unknown>[], [
    { key: "effective_date", header: "Date" },
    { key: "effective_time", header: "Time" },
    { key: "purity", header: "Purity" },
    { key: "rate_per_tola", header: "Rate per Tola" },
    { key: "rate_per_gram", header: "Rate per Gram" },
    { key: "previous_rate_per_tola", header: "Previous Rate per Tola" },
    { key: "rate_change", header: "Change" },
    { key: "percentage_change", header: "% Change" },
    { key: "rate_source", header: "Source" },
    { key: "is_manual", header: "Manual" },
    { key: "is_manual_override", header: "Override" },
    { key: "notes", header: "Notes" },
    { key: "created_at", header: "Recorded At" },
  ]);

  return csvResponse("gold-rate-history.csv", csv);
}
