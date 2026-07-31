import { Card } from "@/components/ui/card";

const FEATURE_GROUPS = [
  {
    title: "Live Market Engine",
    items: ["Realtime candle aggregation", "Automatic reconnection with backoff", "Duplicate/missing-data detection", "Latency monitoring"],
  },
  {
    title: "Signal Intelligence",
    items: ["10 professional strategies", "AI Strategy Selector with confluence", "Rule-based and calibrated ML confidence", "Strict NO TRADE filters"],
  },
  {
    title: "Execution Transparency",
    items: ["Server-time synchronized countdown", "Entry/expiry price capture", "Permanent, unhideable results", "Full audit logging"],
  },
];

export default function FeaturesPage(): React.ReactElement {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-gray-100">Features</h1>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURE_GROUPS.map((group) => (
          <Card key={group.title}>
            <h3 className="font-semibold text-gray-100">{group.title}</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-400">
              {group.items.map((item) => (
                <li key={item}>&bull; {item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  );
}
