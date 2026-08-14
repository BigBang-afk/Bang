import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "System Status" };

const integrations = [
  {
    name: "Supabase (Auth & Database)",
    connected: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    detail: "Authentication, Postgres, and row-level security.",
  },
  {
    name: "Supabase service role",
    connected: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    detail: "Required for admin user management (email lookups).",
  },
  {
    name: "Live market data feed",
    connected: false,
    detail: "Powers Charts, Scanner and real-time pricing — lands in Phase 2.",
  },
  {
    name: "Claude API (AI analysis)",
    connected: Boolean(process.env.ANTHROPIC_API_KEY),
    detail: "Powers AI Analysis and AI-generated setups — lands in Phase 3.",
  },
  {
    name: "Payment provider (Stripe)",
    connected: false,
    detail: "Powers paid subscriptions and billing — lands in a later phase.",
  },
];

export default async function SystemStatusPage() {
  await requireAdmin();

  return (
    <div>
      <PageHeader
        title="System status"
        description="Reflects whether each integration's required environment variables are configured — not a live health check against the provider."
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
                {integration.connected ? "Configured" : "Not configured"}
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
          This checks for the presence of required environment variables server-side, so
          it never reports a fake &quot;connected&quot; state. It does not yet ping each
          provider&apos;s API — live health checks land alongside each integration.
        </CardContent>
      </Card>
    </div>
  );
}
