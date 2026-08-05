"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMarketStore } from "@/store/useMarketStore";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "Why was this signal generated?",
  "What risks exist right now?",
  "Summarize current market conditions.",
  "What market structure is present?",
];

export default function AssistantPage() {
  const signals = useMarketStore((s) => s.signals);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Ask me about any signal, risk, confidence score, or current market structure." },
  ]);
  const [input, setInput] = useState("");

  const mutation = useMutation({
    mutationFn: (question: string) =>
      api
        .post<{ answer: string; source: string }>("/assistant/ask", {
          question,
          context: { signal: signals[0] ?? null },
        })
        .then((r) => r.data),
  });

  function send(question: string) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    mutation.mutate(question, {
      onSuccess: (data) => setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]),
      onError: () => setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, I couldn't process that." }]),
    });
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 h-[calc(100vh-120px)]">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">AI Assistant</h1>
        <p className="text-sm text-slate-500">Grounded in the current top signal and live market analysis.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="text-xs px-3 py-1.5 rounded-full border border-base-700 text-slate-400 hover:text-slate-200">
            {s}
          </button>
        ))}
      </div>

      <div className="card flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              m.role === "user" ? "self-end bg-accent-brand/20 text-slate-100" : "self-start bg-base-800 text-slate-300"
            }`}
          >
            {m.text}
          </div>
        ))}
        {mutation.isPending && <div className="self-start text-xs text-slate-500">Thinking…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a signal, risk, or market structure…"
          className="flex-1 bg-base-800 border border-base-700 rounded px-3 py-2 text-sm"
        />
        <button type="submit" className="bg-accent-brand text-white rounded px-4 py-2 text-sm font-medium">
          Send
        </button>
      </form>
    </div>
  );
}
