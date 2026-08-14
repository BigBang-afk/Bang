import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { ComingSoonPage } from "@/components/dashboard/coming-soon";

export const metadata: Metadata = { title: "AI Analysis" };

export default function AiAnalysisPage() {
  return (
    <ComingSoonPage
      title="AI Analysis"
      description="Structured, AI-generated market analysis — decision-support, not financial advice."
      icon={Sparkles}
      phase="Coming soon"
      emptyTitle="AI market analysis is next"
      emptyDescription="Live crypto market data is connected as of this phase — AI analysis will wire up the Claude API on top of it. Every analysis will be logged in ai_analyses for transparency and usage tracking."
    />
  );
}
