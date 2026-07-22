"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Uploader from "@/components/Uploader";
import ChartOverlay from "@/components/ChartOverlay";
import SignalCard from "@/components/SignalCard";
import BreakdownPanel from "@/components/BreakdownPanel";
import NarrativeCard from "@/components/NarrativeCard";
import Disclaimer from "@/components/Disclaimer";
import HistoryPanel from "@/components/HistoryPanel";
import type { AnalysisResult } from "@/lib/analysis/types";
import { addHistoryEntry, loadHistory, clearHistory, makeThumbnail, type HistoryEntry } from "@/lib/history";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [wantNarrative, setWantNarrative] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const runAnalysis = useCallback(
    async (targetFile: File, url: string) => {
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const formData = new FormData();
        formData.append("image", targetFile);
        formData.append("narrative", wantNarrative ? "true" : "false");

        const res = await fetch("/api/analyze", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Analysis failed.");
          return;
        }

        const analysis = data as AnalysisResult;
        setResult(analysis);

        if (analysis.candleCount > 0) {
          const thumbnail = await makeThumbnail(url);
          const entry: HistoryEntry = {
            id: `${Date.now()}`,
            timestamp: Date.now(),
            thumbnail,
            signal: analysis.signal,
            confidence: analysis.confidence,
            topPattern: analysis.patterns[0]?.name ?? null,
            candleCount: analysis.candleCount,
          };
          setHistory(addHistoryEntry(entry));
        }
      } catch {
        setError("Couldn't reach the analysis server. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [wantNarrative],
  );

  const handleFile = useCallback(
    (selected: File) => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(selected);
      objectUrlRef.current = url;
      setFile(selected);
      setImageUrl(url);
      runAnalysis(selected, url);
    },
    [runAnalysis],
  );

  const rescan = useCallback(() => {
    if (file && imageUrl) runAnalysis(file, imageUrl);
  }, [file, imageUrl, runAnalysis]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Quotex Signal Scanner</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload a 1-minute candlestick chart screenshot. The engine reads candle patterns,
          support/resistance, and momentum to give a CALL/PUT read with an honest confidence score.
        </p>
      </header>

      <div className="mb-6">
        <Disclaimer />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Uploader onFile={handleFile} disabled={loading} />

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wantNarrative}
                onChange={(e) => setWantNarrative(e.target.checked)}
                className="accent-emerald-500"
              />
              AI commentary (Claude vision sanity-check)
            </label>
            {result && result.candleCount > 0 && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOverlay}
                  onChange={(e) => setShowOverlay(e.target.checked)}
                  className="accent-emerald-500"
                />
                Show detection overlay
              </label>
            )}
            {file && (
              <button
                onClick={rescan}
                disabled={loading}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-500 disabled:opacity-50"
              >
                {loading ? "Scanning…" : "Rescan"}
              </button>
            )}
          </div>

          {loading && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
              Reading candles, patterns, and levels…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && result && result.candleCount === 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
              {result.warnings[0] ?? "Couldn't detect candles in this image."}
            </div>
          )}

          {imageUrl && result && result.candleCount > 0 && (
            <ChartOverlay imageUrl={imageUrl} result={result} showOverlay={showOverlay} />
          )}

          {result && result.warnings.length > 0 && result.candleCount > 0 && (
            <ul className="text-xs text-slate-500">
              {result.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}

          {result && result.candleCount > 0 && (
            <SignalCard signal={result.signal} confidence={result.confidence} />
          )}

          {result && (result.narrative || result.narrativeError) && (
            <NarrativeCard narrative={result.narrative} narrativeError={result.narrativeError} />
          )}
        </div>

        <div className="space-y-6">
          {result && result.candleCount > 0 && <BreakdownPanel result={result} />}
          <HistoryPanel
            history={history}
            onClear={() => setHistory(clearHistory())}
          />
        </div>
      </div>
    </main>
  );
}
