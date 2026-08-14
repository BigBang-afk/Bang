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
      phase="Phase 3"
      emptyTitle="AI market analysis lands in Phase 3"
      emptyDescription="AI analysis is wired to the Claude API once real market data is flowing. Every analysis will be logged in ai_analyses for transparency and usage tracking."
    />
  );
}
