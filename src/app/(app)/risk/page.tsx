import Link from "next/link";
import { requireAccount } from "@/lib/require-auth";
import { getEquityCurve } from "@/lib/ledger";
import { computeEquityCurveDrawdown, riskLevelForDrawdown, type RiskLevel } from "@/lib/calc";
import { toNumber, formatUsd, formatPct } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { ArrowRight } from "lucide-react";

const LEVEL_VARIANT: Record<RiskLevel, "positive" | "accent" | "gold" | "negative"> = {
  LOW: "positive",
  MODERATE: "accent",
  HIGH: "gold",
  CRITICAL: "negative",
};

export default async function RiskManagementPage() {
  const { account, settings } = await requireAccount();
  const equityCurve = await getEquityCurve(account.id);
  const drawdown = computeEquityCurveDrawdown(equityCurve.map((p) => ({ date: p.date, balance: p.balance })));

  const thresholds = {
    low: toNumber(settings.drawdownLowPct),
    moderate: toNumber(settings.drawdownModeratePct),
    high: toNumber(settings.drawdownHighPct),
    critical: toNumber(settings.drawdownCriticalPct),
  };

  const currentLevel = riskLevelForDrawdown(drawdown.currentDrawdownPct, thresholds);
  const maxLevel = riskLevelForDrawdown(drawdown.maxDrawdownPct, thresholds);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Risk Management</h1>
          <p className="text-sm text-muted">Drawdown monitor and account risk level.</p>
        </div>
        <Link href="/daily-plan" className="text-xs font-medium text-accent hover:underline">
          Overtrading Protection <ArrowRight size={12} className="inline" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Drawdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Peak Balance" value={formatUsd(drawdown.peakBalance)} />
            <Row label="Current Balance" value={formatUsd(drawdown.currentBalance)} />
            <Row label="Drawdown" value={formatUsd(-drawdown.currentDrawdown)} tone="negative" />
            <Row label="Drawdown %" value={formatPct(drawdown.currentDrawdownPct)} tone="negative" />
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted">Risk Level</span>
              <Badge variant={LEVEL_VARIANT[currentLevel]}>{currentLevel}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maximum Historical Drawdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Peak Balance at Time" value={formatUsd(drawdown.peakBalance)} />
            <Row label="Max Drawdown" value={formatUsd(-drawdown.maxDrawdown)} tone="negative" />
            <Row label="Max Drawdown %" value={formatPct(drawdown.maxDrawdownPct)} tone="negative" />
            {drawdown.peakDate && <Row label="Peak Date" value={formatDate(drawdown.peakDate)} />}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted">Risk Level</span>
              <Badge variant={LEVEL_VARIANT[maxLevel]}>{maxLevel}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Level Thresholds</CardTitle>
          <Link href="/settings" className="text-xs font-medium text-accent hover:underline">
            Edit in Settings <ArrowRight size={12} className="inline" />
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <ThresholdChip label="Low" value={thresholds.low} variant="positive" />
          <ThresholdChip label="Moderate" value={thresholds.moderate} variant="accent" />
          <ThresholdChip label="High" value={thresholds.high} variant="gold" />
          <ThresholdChip label="Critical" value={thresholds.critical} variant="negative" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityCurveChart data={equityCurve.map((p) => ({ date: p.date.toISOString().slice(0, 10), balance: p.balance }))} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "negative" }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-medium ${tone === "negative" ? "text-negative" : ""}`}>{value}</span>
    </div>
  );
}

function ThresholdChip({ label, value, variant }: { label: string; value: number; variant: "positive" | "accent" | "gold" | "negative" }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3 text-center">
      <Badge variant={variant}>{label}</Badge>
      <p className="mt-1 text-sm font-semibold">≥ {value}%</p>
    </div>
  );
}
