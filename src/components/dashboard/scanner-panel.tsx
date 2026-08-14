"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Loader2, ScanSearch } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TIMEFRAMES, type Timeframe } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";
import type { MarketType } from "@/types/database";

type Trend = "bullish" | "bearish" | "neutral";
type Volatility = "low" | "normal" | "high";
type VolumeState = "above_average" | "average" | "below_average" | "unknown";
type RiskLevel = "low" | "medium" | "high";
type EmaCondition =
  | "price_above_fast"
  | "price_below_fast"
  | "price_above_slow"
  | "price_below_slow"
  | "fast_above_slow"
  | "fast_below_slow";

interface IndicatorReadout {
  emaFast: number | null;
  emaSlow: number | null;
  rsi: number | null;
  macdHistogram: number | null;
  atr: number | null;
  atrPercent: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  relativeVolume: number | null;
  momentum: number | null;
}

interface ScannerResultItem {
  symbol: string;
  displayName: string;
  timeframe: Timeframe;
  asOfCandleTime: number;
  price: number;
  trend: Trend;
  momentumReading: Trend;
  volatility: Volatility;
  volumeState: VolumeState;
  score: number;
  setupType: string | null;
  supportingConditions: string[];
  conflictingConditions: string[];
  riskLevel: RiskLevel;
  indicators: IndicatorReadout;
}

interface ScannerResponse {
  items: ScannerResultItem[];
  totalScanned: number;
  unsupportedCount: number;
  dataSource: { providerId: string; providerName: string; latency: "realtime" | "delayed" } | null;
  usage: { used: number; limit: number | null };
}

interface ApiError {
  error: string;
  code?: string;
}

const MARKET_TYPES: { value: MarketType; label: string }[] = [
  { value: "crypto", label: "Crypto" },
  { value: "forex", label: "Forex" },
  { value: "metals", label: "Metals" },
  { value: "indices", label: "Indices" },
  { value: "stocks", label: "Stocks" },
];

const TREND_OPTIONS: { value: Trend; label: string }[] = [
  { value: "bullish", label: "Bullish" },
  { value: "bearish", label: "Bearish" },
  { value: "neutral", label: "Neutral" },
];

const VOLATILITY_OPTIONS: { value: Volatility; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

const VOLUME_OPTIONS: { value: VolumeState; label: string }[] = [
  { value: "above_average", label: "Above average" },
  { value: "average", label: "Average" },
  { value: "below_average", label: "Below average" },
  { value: "unknown", label: "Unknown" },
];

const EMA_CONDITION_OPTIONS: { value: EmaCondition; label: string }[] = [
  { value: "price_above_fast", label: "Price above fast EMA" },
  { value: "price_below_fast", label: "Price below fast EMA" },
  { value: "price_above_slow", label: "Price above slow EMA" },
  { value: "price_below_slow", label: "Price below slow EMA" },
  { value: "fast_above_slow", label: "Fast EMA above slow EMA" },
  { value: "fast_below_slow", label: "Fast EMA below slow EMA" },
];

const ANY = "any";

function trendBadgeVariant(trend: Trend): "default" | "destructive" | "outline" {
  if (trend === "bullish") return "default";
  if (trend === "bearish") return "destructive";
  return "outline";
}

function riskBadgeVariant(risk: RiskLevel): "default" | "destructive" | "secondary" {
  if (risk === "low") return "default";
  if (risk === "high") return "destructive";
  return "secondary";
}

export function ScannerPanel() {
  const [marketType, setMarketType] = useState<MarketType>("crypto");
  const [symbolQuery, setSymbolQuery] = useState("");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [trend, setTrend] = useState<string>(ANY);
  const [volatility, setVolatility] = useState<string>(ANY);
  const [momentum, setMomentum] = useState<string>(ANY);
  const [volumeState, setVolumeState] = useState<string>(ANY);
  const [rsiMin, setRsiMin] = useState("");
  const [rsiMax, setRsiMax] = useState("");
  const [emaCondition, setEmaCondition] = useState<string>(ANY);

  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScannerResponse | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function runScan() {
    setLoading(true);
    setError(null);
    setExpanded(null);

    const params = new URLSearchParams({ market: marketType, timeframe });
    if (symbolQuery.trim()) params.set("symbol", symbolQuery.trim());
    if (trend !== ANY) params.set("trend", trend);
    if (volatility !== ANY) params.set("volatility", volatility);
    if (momentum !== ANY) params.set("momentum", momentum);
    if (volumeState !== ANY) params.set("volumeState", volumeState);
    if (emaCondition !== ANY) params.set("emaCondition", emaCondition);
    if (rsiMin.trim()) params.set("rsiMin", rsiMin.trim());
    if (rsiMax.trim()) params.set("rsiMax", rsiMax.trim());

    try {
      const res = await fetch(`/api/scanner?${params.toString()}`);
      const body = (await res.json()) as ScannerResponse | ApiError;
      if (!res.ok) {
        setError((body as ApiError).error ?? "The scan failed. Try again.");
        setResult(null);
      } else {
        setResult(body as ScannerResponse);
      }
    } catch {
      setError("Couldn't reach the scanner. Check your connection and try again.");
      setResult(null);
    } finally {
      setLoading(false);
      setHasRun(true);
    }
  }

  const marketIsUnsupported =
    result !== null && result.dataSource === null && result.totalScanned > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Market</Label>
              <Select value={marketType} onValueChange={(v) => setMarketType(v as MarketType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MARKET_TYPES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Symbol</Label>
              <Input
                placeholder="e.g. BTC"
                value={symbolQuery}
                onChange={(e) => setSymbolQuery(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Timeframe</Label>
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Trend</Label>
              <Select value={trend} onValueChange={(v) => setTrend(v ?? ANY)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any</SelectItem>
                  {TREND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Volatility</Label>
              <Select value={volatility} onValueChange={(v) => setVolatility(v ?? ANY)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any</SelectItem>
                  {VOLATILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Momentum</Label>
              <Select value={momentum} onValueChange={(v) => setMomentum(v ?? ANY)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any</SelectItem>
                  {TREND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Volume</Label>
              <Select value={volumeState} onValueChange={(v) => setVolumeState(v ?? ANY)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any</SelectItem>
                  {VOLUME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>EMA condition</Label>
              <Select value={emaCondition} onValueChange={(v) => setEmaCondition(v ?? ANY)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any</SelectItem>
                  {EMA_CONDITION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>RSI min</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={rsiMin}
                onChange={(e) => setRsiMin(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>RSI max</Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="100"
                value={rsiMax}
                onChange={(e) => setRsiMax(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Scores measure how many independent technical conditions agree right now — not a
              prediction, and not a guaranteed signal.
            </p>
            <Button onClick={runScan} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
              Run scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Scan failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Scanned {result.totalScanned} asset{result.totalScanned === 1 ? "" : "s"}
              {result.unsupportedCount > 0 && ` · ${result.unsupportedCount} skipped (no data)`}
            </span>
            {result.dataSource && (
              <span>
                Source: {result.dataSource.providerName} (
                {result.dataSource.latency === "realtime" ? "real-time" : "delayed"})
              </span>
            )}
            {result.usage.limit !== null && (
              <span>
                {result.usage.used} / {result.usage.limit} scans used today
              </span>
            )}
          </div>

          {marketIsUnsupported ? (
            <EmptyState
              icon={ScanSearch}
              title="No data source connected for this market"
              description="This market is tracked but not yet wired to a live data provider, so the scanner has nothing to analyze here yet. Try Crypto, which is connected to live Binance.US data."
            />
          ) : result.items.length === 0 ? (
            <EmptyState
              icon={ScanSearch}
              title="No matches"
              description="No assets in this market currently satisfy every filter you set. Try loosening a condition (RSI range, trend, or volume) and run the scan again."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Symbol</TableHead>
                      <TableHead>Current price</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Momentum</TableHead>
                      <TableHead>Volatility</TableHead>
                      <TableHead>Technical score</TableHead>
                      <TableHead>Last update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.items.map((item) => {
                      const isOpen = expanded === item.symbol;
                      return (
                        <Fragment key={item.symbol}>
                          <TableRow
                            className="cursor-pointer"
                            onClick={() => setExpanded(isOpen ? null : item.symbol)}
                          >
                            <TableCell>
                              {isOpen ? (
                                <ChevronDown className="size-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.symbol}
                              <span className="ml-2 font-normal text-muted-foreground">
                                {item.displayName}
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.price.toLocaleString(undefined, { maximumFractionDigits: 5 })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={trendBadgeVariant(item.trend)}>{item.trend}</Badge>
                            </TableCell>
                            <TableCell className="capitalize text-muted-foreground">
                              {item.momentumReading}
                            </TableCell>
                            <TableCell className="capitalize text-muted-foreground">
                              {item.volatility}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "font-medium",
                                  item.score >= 60
                                    ? "text-success"
                                    : item.score <= 30
                                      ? "text-danger"
                                      : "text-foreground"
                                )}
                              >
                                {item.score}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(item.asOfCandleTime * 1000).toLocaleString()}
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow>
                              <TableCell />
                              <TableCell colSpan={7} className="bg-muted/30">
                                <div className="grid gap-4 py-2 sm:grid-cols-2">
                                  <div>
                                    <div className="mb-1.5 flex items-center gap-2">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        Setup type
                                      </span>
                                      <Badge variant={riskBadgeVariant(item.riskLevel)}>
                                        {item.riskLevel} risk
                                      </Badge>
                                    </div>
                                    <p className="text-sm">
                                      {item.setupType ?? "No qualifying setup at this score."}
                                    </p>
                                  </div>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                                        Supporting
                                      </p>
                                      {item.supportingConditions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">None</p>
                                      ) : (
                                        <ul className="space-y-1 text-xs text-success">
                                          {item.supportingConditions.map((c) => (
                                            <li key={c}>{c}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                    <div>
                                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                                        Conflicting
                                      </p>
                                      {item.conflictingConditions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">None</p>
                                      ) : (
                                        <ul className="space-y-1 text-xs text-danger">
                                          {item.conflictingConditions.map((c) => (
                                            <li key={c}>{c}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!error && !result && hasRun === false && (
        <EmptyState
          icon={ScanSearch}
          title="Set your filters and run a scan"
          description="The scanner analyzes closed candles only — the currently-forming candle is never used, so scores don't repaint after the fact."
        />
      )}
    </div>
  );
}
