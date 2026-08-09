import { requireAccount } from "@/lib/require-auth";
import { toNumber } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsForm } from "./settings-form";
import { AccountPreferencesForm } from "./account-preferences-form";
import { ChangePasswordForm, SetPinForm } from "./security-forms";
import { DataManagement } from "./data-management";

export default async function SettingsPage() {
  const { account, settings } = await requireAccount();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">Configure rates, defaults, appearance, security, and data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle current={settings.theme} />
        </CardContent>
      </Card>

      <AccountPreferencesForm mainTradingType={account.mainTradingType} />

      <SettingsForm
        initial={{
          usdToPkrRate: toNumber(settings.usdToPkrRate).toString(),
          goldPricePerGramPkr: toNumber(settings.goldPricePerGramPkr).toString(),
          defaultRiskPct: toNumber(settings.defaultRiskPct).toString(),
          defaultDailyTargetPct: toNumber(settings.defaultDailyTargetPct).toString(),
          defaultDailyLossPct: toNumber(settings.defaultDailyLossPct).toString(),
          defaultMaxTrades: settings.defaultMaxTrades.toString(),
          defaultMaxConsecutiveLosses: settings.defaultMaxConsecutiveLosses.toString(),
          countBreakevenAsWin: settings.countBreakevenAsWin,
          drawdownLowPct: toNumber(settings.drawdownLowPct).toString(),
          drawdownModeratePct: toNumber(settings.drawdownModeratePct).toString(),
          drawdownHighPct: toNumber(settings.drawdownHighPct).toString(),
          drawdownCriticalPct: toNumber(settings.drawdownCriticalPct).toString(),
          theme: settings.theme,
          timezone: settings.timezone,
        }}
      />

      <ChangePasswordForm />
      <SetPinForm />
      <DataManagement />
    </div>
  );
}
