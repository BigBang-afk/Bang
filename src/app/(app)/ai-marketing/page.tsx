import { Users, Crown, UserX, PhoneCall, Megaphone, Send, CheckCheck, Eye, MessageSquare, TrendingUp, Sparkles } from "lucide-react";
import { getAiMarketingDashboardSummary, getAiInsights } from "@/services/ai-marketing-dashboard.service";
import { RealMetricCard } from "@/components/dashboard/real-metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "AI Dashboard | Zarghoon Jewellers" };

export default async function AiMarketingDashboardPage() {
  const [summary, insights] = await Promise.all([getAiMarketingDashboardSummary(), getAiInsights()]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
          <Sparkles className="size-5 text-gold" /> AI Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          AI-assisted customer segmentation, follow-ups, and campaign performance — every figure below is computed
          live from real sales, customer, and messaging data. AI assists staff; it never sends anything on its own.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <RealMetricCard icon={Users} label="Customers" value={String(summary.totalCustomers)} href="/customers" />
        <RealMetricCard icon={Crown} label="VIP Customers" value={String(summary.vipCustomers)} href="/customers/vip" />
        <RealMetricCard icon={UserX} label="Inactive Customers" value={String(summary.inactiveCustomers)} href="/customers/inactive" />
        <RealMetricCard icon={PhoneCall} label="Ready for Follow-Up" value={String(summary.readyForFollowUp)} href="/ai-marketing/customers-to-contact" />
        <RealMetricCard icon={Megaphone} label="Campaigns Active" value={String(summary.campaignsActive)} href="/ai-marketing/campaigns" />
        <RealMetricCard icon={Send} label="Messages Sent" value={String(summary.messagesSent)} href="/ai-marketing/analytics" />
        <RealMetricCard icon={CheckCheck} label="Messages Delivered" value={String(summary.messagesDelivered)} href="/ai-marketing/analytics" />
        <RealMetricCard icon={Eye} label="Messages Read" value={String(summary.messagesRead)} href="/ai-marketing/analytics" />
        <RealMetricCard icon={MessageSquare} label="Responses" value={String(summary.responses)} href="/ai-marketing/analytics" />
        <RealMetricCard icon={TrendingUp} label="Conversions" value={String(summary.conversions)} href="/ai-marketing/analytics" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold" /> AI Insights
            <Badge variant="default">AI RECOMMENDATION</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notable patterns found in the current data.</p>
          ) : (
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground">
                  {insight.text}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
