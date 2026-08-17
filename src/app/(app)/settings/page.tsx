import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireUser, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSystemSettings } from "@/services/system-setting.service";
import { getEffectiveRatesForDate, getTodayBusinessDate } from "@/services/gold-rate.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoldRateForm } from "@/components/gold-rate/gold-rate-form";
import { formatCurrency } from "@/lib/format";
import { PURITY_LABELS, type GoldPurity } from "@/types/gold";

export const metadata = {
  title: "Settings | Zarghoon Jewellers",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const [settings, rates, canSetGoldRates] = await Promise.all([
    getSystemSettings(["business.name", "business.currency"]),
    getEffectiveRatesForDate(getTodayBusinessDate()),
    userHasPermission(user, PERMISSIONS.GOLD_RATE_CREATE),
  ]);

  const byPurity = new Map(rates.map((rate) => [rate.purity, rate]));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business configuration and daily gold rate management.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business Profile</CardTitle>
          <CardDescription>Core identity used across invoices and reports.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Business Name
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{settings["business.name"]}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Currency
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{settings["business.currency"]}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Gold Rates</CardTitle>
            <CardDescription>Today&apos;s effective rate per gram.</CardDescription>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/settings/gold-rates/history">
              View History
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {rates.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {(["K24", "K22", "K21", "K18", "SILVER"] as GoldPurity[])
                .filter((purity) => byPurity.has(purity))
                .map((purity) => (
                  <div
                    key={purity}
                    className="rounded-md border border-border bg-surface-elevated px-3 py-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {PURITY_LABELS[purity]}
                    </p>
                    <p className="mt-1 text-base font-semibold text-gold">
                      {formatCurrency(byPurity.get(purity)!.ratePerGram.toString())}
                    </p>
                  </div>
                ))}
            </div>
          ) : canSetGoldRates ? (
            <div className="space-y-4">
              <Badge variant="warning">Today&apos;s rates have not been set yet</Badge>
              <GoldRateForm />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Today&apos;s rates have not been set yet. Contact an owner or admin.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
