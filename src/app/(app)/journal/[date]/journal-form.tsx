"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDailyJournalAction } from "@/lib/actions/daily-journal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea, FormField, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScreenshotUpload } from "@/components/ui/screenshot-upload";

interface JournalValues {
  todaysGoal: string;
  marketOutlook: string;
  tradingPlan: string;
  whatWentWell: string;
  whatWentWrong: string;
  mistakes: string;
  lessonsLearned: string;
  emotionalState: string;
  confidence: string;
  disciplineScore: string;
  emotionalControlScore: string;
  executionScore: string;
  riskManagementScore: string;
  overallScore: string;
  screenshotUrl: string | null;
  tomorrowsImprovement: string;
}

function RatingSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  );
}

export function JournalForm({ date, initial }: { date: string; initial: JournalValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function set<K extends keyof JournalValues>(key: K, v: JournalValues[K]) {
    setValues((s) => ({ ...s, [key]: v }));
    setSaved(false);
  }

  function submit() {
    startTransition(async () => {
      await saveDailyJournalAction({
        date,
        ...values,
        confidence: values.confidence || undefined,
        disciplineScore: values.disciplineScore || undefined,
        emotionalControlScore: values.emotionalControlScore || undefined,
        executionScore: values.executionScore || undefined,
        riskManagementScore: values.riskManagementScore || undefined,
        overallScore: values.overallScore || undefined,
      });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Today's Goal">
            <Textarea rows={2} value={values.todaysGoal} onChange={(e) => set("todaysGoal", e.target.value)} />
          </FormField>
          <FormField label="Market Outlook">
            <Textarea rows={2} value={values.marketOutlook} onChange={(e) => set("marketOutlook", e.target.value)} />
          </FormField>
          <FormField label="Trading Plan">
            <Textarea rows={2} value={values.tradingPlan} onChange={(e) => set("tradingPlan", e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="What Went Well">
            <Textarea rows={2} value={values.whatWentWell} onChange={(e) => set("whatWentWell", e.target.value)} />
          </FormField>
          <FormField label="What Went Wrong">
            <Textarea rows={2} value={values.whatWentWrong} onChange={(e) => set("whatWentWrong", e.target.value)} />
          </FormField>
          <FormField label="Mistakes">
            <Textarea rows={2} value={values.mistakes} onChange={(e) => set("mistakes", e.target.value)} />
          </FormField>
          <FormField label="Lessons Learned">
            <Textarea rows={2} value={values.lessonsLearned} onChange={(e) => set("lessonsLearned", e.target.value)} />
          </FormField>
          <FormField label="Tomorrow's Improvement">
            <Textarea rows={2} value={values.tomorrowsImprovement} onChange={(e) => set("tomorrowsImprovement", e.target.value)} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mindset & Ratings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Emotional State">
            <Input value={values.emotionalState} onChange={(e) => set("emotionalState", e.target.value)} placeholder="Calm, anxious, confident…" />
          </FormField>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <FormField label="Confidence (1-10)">
              <RatingSelect value={values.confidence} onChange={(v) => set("confidence", v)} />
            </FormField>
            <FormField label="Discipline (1-10)">
              <RatingSelect value={values.disciplineScore} onChange={(v) => set("disciplineScore", v)} />
            </FormField>
            <FormField label="Emotional Control (1-10)">
              <RatingSelect value={values.emotionalControlScore} onChange={(v) => set("emotionalControlScore", v)} />
            </FormField>
            <FormField label="Execution (1-10)">
              <RatingSelect value={values.executionScore} onChange={(v) => set("executionScore", v)} />
            </FormField>
            <FormField label="Risk Management (1-10)">
              <RatingSelect value={values.riskManagementScore} onChange={(v) => set("riskManagementScore", v)} />
            </FormField>
            <FormField label="Overall Day Score (1-10)">
              <RatingSelect value={values.overallScore} onChange={(v) => set("overallScore", v)} />
            </FormField>
          </div>
          <ScreenshotUpload value={values.screenshotUrl} onChange={(url) => set("screenshotUrl", url)} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-positive">Saved</span>}
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save Journal Entry"}
        </Button>
      </div>
    </div>
  );
}
