"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SymbolSearch } from "@/components/dashboard/symbol-search";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIMEFRAMES, type Timeframe } from "@/lib/market-data/types";
import type { AIAnalysisOutput } from "@/lib/ai/schema";
import type { AnalysisInputSnapshot } from "@/lib/ai/types";
import type { MarketAssetRow } from "@/types/database";

interface AnalysisResponse {
  analysisId: string;
  symbol: string;
  displayName: string;
  timeframe: Timeframe;
  snapshot: AnalysisInputSnapshot;
  analysis: AIAnalysisOutput;
  model: string;
  tokensUsed: number;
  latencyMs: number;
  cached: boolean;
  createdAt: string;
  usage: { used: number; limit: number | null };
}

interface ApiError {
  error: string;
  code?: string;
}

function biasBadgeVariant(bias: "bullish" | "bearish" | "neutral"): "default" | "destructive" | "outline" {
  if (bias === "bullish") return "default";
  if (bias === "bearish") return "destructive";
  return "outline";
}

function qualityBadgeVariant(
  quality: AIAnalysisOutput["setup_quality"]
): "default" | "secondary" | "outline" {
  if (quality === "excellent" || quality === "good") return "default";
  if (quality === "fair") return "secondary";
  return "outline";
}

function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export function AiAnalysisPanel({ assets }: { assets: MarketAssetRow[] }) {
  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? "");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [showData, setShowData] = useState(false);

  async function analyze() {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe }),
      });
      const body = (await res.json()) as AnalysisResponse | ApiError;
      if (!res.ok) {
        setError((body as ApiError).error ?? "The analysis failed. Try again.");
        setResult(null);
      } else {
        setResult(body as AnalysisResponse);
        setShowData(false);
      }
    } catch {
      setError("Couldn't reach the AI analysis service. Check your connection and try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Symbol</Label>
              <SymbolSearch assets={assets} value={symbol} onSelect={setSymbol} />
            </div>
            <div className="space-y-1.5">
              <Label>Timeframe</Label>
              <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
                <TabsList>
                  {TIMEFRAMES.map((tf) => (
                    <TabsTrigger key={tf} value={tf}>
                      {tf}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <Button onClick={analyze} disabled={loading || !symbol} className="ml-auto">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Analyze
            </Button>
          </div>
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            Confidence is an analytical score measuring how many technical signals agree with
            each other right now — not a probability of profit, a win-rate estimate, or a
            guarantee of any outcome. This is decision-support, not financial advice.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && !result && (
        <EmptyState
          icon={Sparkles}
          title="Run an AI analysis"
          description="Pick a symbol and timeframe, then Analyze. The model only sees this platform's own live price, indicator and scanner data for that symbol — nothing fabricated, nothing from outside what's shown below."
        />
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {result.symbol} · {result.displayName} · {result.timeframe}
            </span>
            <span>{new Date(result.createdAt).toLocaleString()}</span>
            <span>Model: {result.model}</span>
            {result.cached && <Badge variant="outline">Served from cache</Badge>}
            {result.usage.limit !== null && (
              <span>
                {result.usage.used} / {result.usage.limit} analyses used today
              </span>
            )}
          </div>

          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant={biasBadgeVariant(result.analysis.market_bias)}>
                  Bias: {result.analysis.market_bias}
                </Badge>
                <Badge variant="outline">Trend: {result.analysis.trend}</Badge>
                <Badge variant="outline">Momentum: {result.analysis.momentum}</Badge>
                <Badge variant="outline">Volatility: {result.analysis.volatility}</Badge>
                <Badge variant={qualityBadgeVariant(result.analysis.setup_quality)}>
                  Setup: {result.analysis.setup_quality}
                </Badge>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">Confidence score</span>
                  <span className="text-muted-foreground">{result.analysis.confidence_score}/100</span>
                </div>
                <Progress value={result.analysis.confidence_score} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Agreement across technical signals — not a probability of profit.
                </p>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium">Explanation</h3>
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {result.analysis.explanation}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Supporting factors</h3>
                  {result.analysis.bullish_factors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-success">
                      {result.analysis.bullish_factors.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-medium">Conflicting factors</h3>
                  {result.analysis.bearish_factors.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-danger">
                      {result.analysis.bearish_factors.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-medium">Key levels</h3>
                {result.analysis.key_levels.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None identified</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {result.analysis.key_levels.map((lvl, i) => (
                      <Badge key={`${lvl.type}-${lvl.price}-${i}`} variant={lvl.type === "support" ? "default" : "destructive"}>
                        {lvl.type} {formatNumber(lvl.price)}
                        {lvl.label ? ` — ${lvl.label}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-medium">Invalidation conditions</h3>
                {result.analysis.invalidation_conditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">None stated</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                    {result.analysis.invalidation_conditions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>

              <Alert>
                <AlertTitle>Risk notes</AlertTitle>
                <AlertDescription>{result.analysis.risk_notes}</AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <button
                type="button"
                onClick={() => setShowData((s) => !s)}
                className="flex w-full items-center justify-between text-sm font-medium"
              >
                Data used for this analysis
                {showData ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              {showData && (
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <DataField label="Price (last closed candle)" value={formatNumber(result.snapshot.price)} />
                  <DataField
                    label="24h change"
                    value={
                      result.snapshot.change24hPercent !== null
                        ? `${result.snapshot.change24hPercent.toFixed(2)}%`
                        : "—"
                    }
                  />
                  <DataField label="Market status" value={result.snapshot.marketStatus} />
                  <DataField label="EMA fast" value={formatNumber(result.snapshot.indicators.emaFast)} />
                  <DataField label="EMA slow" value={formatNumber(result.snapshot.indicators.emaSlow)} />
                  <DataField label="RSI" value={formatNumber(result.snapshot.indicators.rsi)} />
                  <DataField
                    label="MACD histogram"
                    value={formatNumber(result.snapshot.indicators.macdHistogram)}
                  />
                  <DataField label="ATR" value={formatNumber(result.snapshot.indicators.atr)} />
                  <DataField label="ATR %" value={formatNumber(result.snapshot.indicators.atrPercent)} />
                  <DataField label="ADX" value={formatNumber(result.snapshot.indicators.adx)} />
                  <DataField
                    label="Relative volume"
                    value={formatNumber(result.snapshot.indicators.relativeVolume)}
                  />
                  <DataField label="Technical score" value={String(result.snapshot.technicalScore)} />
                  <DataField label="Setup type" value={result.snapshot.setupType ?? "—"} />
                  <DataField
                    label="As of candle"
                    value={new Date(result.snapshot.asOfCandleTime).toLocaleString()}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
