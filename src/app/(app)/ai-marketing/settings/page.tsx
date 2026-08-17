import { getMarketingSettings } from "@/services/marketing-settings.service";
import { MarketingSettingsForm } from "@/components/ai-marketing/marketing-settings-form";

export const metadata = { title: "AI Marketing Settings | Zarghoon Jewellers" };

export default async function AiMarketingSettingsPage() {
  const settings = await getMarketingSettings();

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configurable limits used across campaigns, message queueing, attribution, and scoring — never hardcoded.
        </p>
      </div>
      <MarketingSettingsForm initial={settings} />
    </div>
  );
}
