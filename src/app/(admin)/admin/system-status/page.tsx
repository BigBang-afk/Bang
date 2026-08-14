import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { getDataSource } from "@/lib/market-data";
import { requireAdmin } from "@/lib/auth/session";
import type { MarketType } from "@/types/database";

export const metadata: Metadata = { title: "System Status" };

const MARKET_TYPES: MarketType[] = ["crypto", "forex", "metals", "indices"];
const marketLabel: Record<MarketType, string> = {
  crypto: "Crypto",
  forex: "Forex",
  metals: "Gold / Metals",
  indices: "Indices",
  stocks: "Stocks",
};

function buildIntegrations() {
  const marketRows = MARKET_TYPES.map((type) => {
    const source = getDataSource(type);
    return {
      name: `${marketLabel[type]} market data`,
      connected: Boolean(source),
      detail: source
        ? `Live via ${source.providerName} (${source.latency}).`
        : "No provider connected — Charts/Markets show this market as unsupported.",
    };
  });

  return [
    {
      name: "Supabase (Auth & Database)",
      connected: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      detail: "Authentication, Postgres, and row-level security.",
    },
    {
      name: "Supabase service role",
      connected: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      detail: "Required for admin user management (email lookups) and account deletion.",
    },
    ...marketRows,
    {
      name: "Claude API (AI analysis)",
      connected: Boolean(process.env.ANTHROPIC_API_KEY),
      detail: "Powers AI Analysis and AI-generated setups — not yet wired up.",
    },
    {
      name: "Payment provider (Stripe)",
      connected: false,
      detail: "Powers paid subscriptions and billing — lands in a later phase.",
    },
  ];
}

export default async function SystemStatusPage() {
  await requireAdmin();
  const integrations = buildIntegrations();

  return (
    <div>
      <PageHeader
        title="System status"
        description="Market data rows reflect the actual provider registry (lib/market-data/registry.ts); everything else reflects whether required environment variables are configured. Neither pings the provider live."
      />

      <div className="space-y-3">
        {integrations.map((integration) => (
          <Card key={integration.name}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {integration.connected ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : (
                  <CircleDashed className="size-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.detail}</p>
                </div>
              </div>
              <Badge variant={integration.connected ? "default" : "secondary"}>
                {integration.connected ? "Connected" : "Not configured"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">About this page</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This checks for the presence of required environment variables and the
          market-data provider registry server-side, so it never reports a fake
          &quot;connected&quot; state. It does not yet ping each provider&apos;s API for
          live uptime — that lands alongside real health checks in a later phase.
        </CardContent>
      </Card>
    </div>
  );
}
