"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, Sparkles, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { askAiAssistantAction } from "@/lib/actions/ai-assistant.actions";

const EXAMPLE_QUESTIONS = [
  "What are today's sales?",
  "Which customers are inactive?",
  "Who are our top customers?",
  "How much gold is currently with karigars?",
  "Which campaign performed best?",
];

type Turn = { question: string; answer: string; denied: boolean };

export function AiAssistantChat() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, startTransition] = useTransition();

  function ask(text: string) {
    if (!text.trim()) return;
    startTransition(async () => {
      const result = await askAiAssistantAction({ question: text });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setTurns((prev) => [...prev, { question: text, answer: result.data.answer, denied: result.data.denied }]);
      setQuestion("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-gold-muted hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex min-h-40 flex-col gap-3 rounded-md border border-border bg-surface-elevated p-4">
        {turns.length === 0 && <p className="text-sm text-muted-foreground">Ask a question about sales, customers, inventory, gold, or campaigns.</p>}
        {turns.map((turn, i) => (
          <div key={i} className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">{turn.question}</p>
            <p className={`flex items-start gap-1.5 text-sm ${turn.denied ? "text-danger" : "text-muted-foreground"}`}>
              {turn.denied ? <ShieldAlert className="mt-0.5 size-4 shrink-0" /> : <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />}
              {turn.answer}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          placeholder="Ask the AI assistant..."
        />
        <Button onClick={() => ask(question)} disabled={pending}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
