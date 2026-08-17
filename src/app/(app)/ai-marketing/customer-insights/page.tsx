import { CustomerInsightsPanel } from "@/components/ai-marketing/customer-insights-panel";

export const metadata = { title: "Customer Insights | Zarghoon Jewellers" };

export default function CustomerInsightsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Customer Insights</h1>
        <p className="text-sm text-muted-foreground">
          Search a customer to see their AI summary, segments, Business Engagement Score, and product
          recommendations — all built only from their real purchase history.
        </p>
      </div>
      <CustomerInsightsPanel />
    </div>
  );
}
