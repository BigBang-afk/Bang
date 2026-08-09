import Link from "next/link";
import Image from "next/image";
import { requireAccount } from "@/lib/require-auth";
import { prisma } from "@/lib/prisma";
import { buildTradeWhere } from "@/lib/trade-filters";
import { toNumber, formatUsd, formatPkr, formatGrams } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResultBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { TradeFilters } from "./trade-filters";
import { TradeRowActions } from "./trade-row-actions";
import { Plus, ImageOff } from "lucide-react";

const PAGE_SIZE = 50;

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const { account } = await requireAccount();

  const page = Math.max(1, Number(params.page) || 1);
  const where = buildTradeWhere(account.id, params);

  const [trades, total, symbolRows, strategies] = await Promise.all([
    prisma.trade.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { strategy: true },
    }),
    prisma.trade.count({ where }),
    prisma.trade.findMany({
      where: { tradingAccountId: account.id, deletedAt: null },
      select: { symbol: true },
      distinct: ["symbol"],
    }),
    prisma.strategy.findMany({ where: { tradingAccountId: account.id }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Trade Journal</h1>
          <p className="text-sm text-muted">{total} trade{total === 1 ? "" : "s"} recorded</p>
        </div>
        <LinkButton href="/trades/new" size="sm">
          <Plus size={16} /> Add Trade
        </LinkButton>
      </div>

      <TradeFilters symbols={symbolRows.map((s) => s.symbol)} strategies={strategies} />

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <TR>
              <TH>#</TH>
              <TH>Date</TH>
              <TH>Symbol</TH>
              <TH>Direction</TH>
              <TH>Strategy</TH>
              <TH>Risk</TH>
              <TH>Gross</TH>
              <TH>Fees</TH>
              <TH>Net USD</TH>
              <TH>PKR</TH>
              <TH>Gold</TH>
              <TH>Result</TH>
              <TH>Shot</TH>
              <TH>Notes</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {trades.map((t, i) => {
              const net = toNumber(t.netPnlUsd);
              return (
                <TR key={t.id}>
                  <TD className="text-muted">{total - ((page - 1) * PAGE_SIZE + i)}</TD>
                  <TD>{formatDate(t.date)}</TD>
                  <TD className="font-medium">{t.symbol}</TD>
                  <TD>{t.direction}</TD>
                  <TD className="text-muted">{t.strategy?.name ?? "—"}</TD>
                  <TD>{t.riskUsd ? formatUsd(toNumber(t.riskUsd)) : "—"}</TD>
                  <TD>{formatUsd(toNumber(t.grossPnlUsd), { showSign: true })}</TD>
                  <TD className="text-muted">{formatUsd(toNumber(t.feesUsd))}</TD>
                  <TD className={net >= 0 ? "text-positive font-medium" : "text-negative font-medium"}>
                    {formatUsd(net, { showSign: true })}
                  </TD>
                  <TD className={net >= 0 ? "text-positive" : "text-negative"}>
                    {formatPkr(toNumber(t.pnlPkr), { showSign: true })}
                  </TD>
                  <TD className="text-gold">{formatGrams(Math.abs(toNumber(t.goldEquivalentG)), { valueOnly: true })}</TD>
                  <TD>
                    <ResultBadge result={t.result as "WIN" | "LOSS" | "BREAKEVEN"} />
                  </TD>
                  <TD>
                    {t.screenshotUrl ? (
                      <Link href={t.screenshotUrl} target="_blank" className="relative block h-8 w-8 overflow-hidden rounded border border-border">
                        <Image src={t.screenshotUrl} alt="" fill className="object-cover" unoptimized />
                      </Link>
                    ) : (
                      <ImageOff size={16} className="text-muted-2" />
                    )}
                  </TD>
                  <TD className="max-w-40 truncate text-muted" title={t.notes ?? ""}>
                    {t.notes ?? "—"}
                  </TD>
                  <TD>
                    <TradeRowActions id={t.id} symbol={t.symbol} />
                  </TD>
                </TR>
              );
            })}
            {trades.length === 0 && (
              <TR>
                <TD colSpan={15} className="py-10 text-center text-muted">
                  No trades match your filters yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/trades?${new URLSearchParams({ ...params, page: String(p) } as Record<string, string>).toString()}`}
              className={`rounded-md px-3 py-1.5 ${p === page ? "bg-accent text-white" : "text-muted hover:bg-surface-hover"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
