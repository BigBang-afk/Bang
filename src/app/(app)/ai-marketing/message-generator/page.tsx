import { StandaloneMessageGenerator } from "@/components/ai-marketing/standalone-message-generator";

export const metadata = { title: "AI Message Generator | Zarghoon Jewellers" };

export default function MessageGeneratorPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">AI Message Generator</h1>
        <p className="text-sm text-muted-foreground">
          Draft a marketing message from a segment, product, objective, tone, language, and offer. Every message is
          checked for false claims, fake scarcity, guaranteed returns, and unauthorized discounts before it can be
          used in a campaign.
        </p>
      </div>
      <StandaloneMessageGenerator />
    </div>
  );
}
