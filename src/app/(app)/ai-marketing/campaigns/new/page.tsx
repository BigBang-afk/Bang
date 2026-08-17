import { CampaignWizardForm } from "@/components/ai-marketing/campaign-wizard-form";

export const metadata = { title: "New Campaign | Zarghoon Jewellers" };

export default function NewCampaignPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">New Campaign</h1>
        <p className="text-sm text-muted-foreground">
          Build a campaign step by step. Launch always requires audience consent to be satisfied — see the audience
          preview below.
        </p>
      </div>
      <CampaignWizardForm />
    </div>
  );
}
