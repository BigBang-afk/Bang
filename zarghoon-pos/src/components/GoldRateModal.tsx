import { useState } from "react";
import { useGoldRateStore } from "../store/goldRateStore";
import { useSettingsStore } from "../store/settingsStore";
import { GRAMS_PER_TOLA, formatMoney } from "../lib/format";

interface GoldRateModalProps {
  onDone: () => void;
  forceOpen?: boolean;
}

export default function GoldRateModal({ onDone, forceOpen }: GoldRateModalProps) {
  const { k21, k18, k22, k24, setK21Rate, acknowledgeDailyPrompt } = useGoldRateStore();
  const currency = useSettingsStore((s) => s.currency);
  const hasExistingRate = k21 > 0;

  const [unit, setUnit] = useState<"gram" | "tola">("gram");
  const [value, setValue] = useState<string>(hasExistingRate ? String(k21) : "");
  const [autoDerive, setAutoDerive] = useState(true);
  const [error, setError] = useState("");

  const perGramValue =
    unit === "tola" && value ? Number(value) / GRAMS_PER_TOLA : Number(value);

  function handleSave() {
    const num = Number(value);
    if (!value || Number.isNaN(num) || num <= 0) {
      setError("Enter a valid gold rate greater than 0");
      return;
    }
    setK21Rate(Math.round(perGramValue), autoDerive);
    onDone();
  }

  function handleKeepSame() {
    acknowledgeDailyPrompt();
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="animate-rise w-full max-w-md overflow-hidden rounded-2xl border border-gold-800/50 bg-gradient-to-b from-ink-800 to-ink-950 shadow-[0_0_60px_-10px_rgba(212,175,55,0.35)]">
        <div className="border-b border-gold-900/60 bg-ink-900/60 px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold-500/70">
            Daily Rate Update
          </p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-gold-100">
            Today's 21K Gold Rate
          </h2>
          <p className="mt-1 text-sm text-ink-500 text-[#a89a7d]">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {hasExistingRate && (
            <div className="rounded-lg border border-gold-900/40 bg-ink-900/50 px-4 py-2 text-sm text-[#c9bd9e]">
              Previous rate: <span className="text-gold-300 font-medium">{formatMoney(k21, currency)}/g</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              21 Karat Rate
            </label>
            <div className="flex rounded-lg border border-gold-900/50 bg-ink-950 focus-within:border-gold-500/70">
              <span className="flex items-center pl-3 pr-1 text-gold-500/80 text-sm">{currency}</span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                min={0}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                placeholder="e.g. 24500"
                className="w-full bg-transparent py-2.5 pr-2 text-lg font-semibold text-gold-100 outline-none placeholder:text-ink-500"
              />
              <div className="flex items-center gap-1 pr-2">
                {(["gram", "tola"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                      unit === u
                        ? "bg-gold-600/20 text-gold-300"
                        : "text-ink-500 hover:text-gold-400"
                    }`}
                  >
                    /{u}
                  </button>
                ))}
              </div>
            </div>
            {unit === "tola" && value && !Number.isNaN(Number(value)) && (
              <p className="mt-1.5 text-xs text-ink-500">
                ≈ {formatMoney(perGramValue, currency)} per gram
              </p>
            )}
            {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm text-[#c9bd9e]">
            <input
              type="checkbox"
              checked={autoDerive}
              onChange={(e) => setAutoDerive(e.target.checked)}
              className="h-4 w-4 rounded border-gold-800 accent-[#d4af37]"
            />
            Auto-calculate 18K, 22K &amp; 24K from this rate
          </label>

          {autoDerive && value && !Number.isNaN(perGramValue) && perGramValue > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["18K", Math.round(perGramValue * (18 / 21))],
                ["22K", Math.round(perGramValue * (22 / 21))],
                ["24K", Math.round(perGramValue * (24 / 21))],
              ].map(([label, val]) => (
                <div key={label} className="rounded-lg border border-gold-900/40 bg-ink-900/40 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">{label}</div>
                  <div className="text-sm font-medium text-gold-300">{formatMoney(Number(val), currency)}</div>
                </div>
              ))}
            </div>
          )}

          {!autoDerive && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-ink-500">
              <div>18K: {formatMoney(k18, currency)}</div>
              <div>22K: {formatMoney(k22, currency)}</div>
              <div>24K: {formatMoney(k24, currency)}</div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-gold-900/40 bg-ink-900/40 px-6 py-4">
          {hasExistingRate && !forceOpen && (
            <button
              onClick={handleKeepSame}
              className="flex-1 rounded-lg border border-gold-900/50 py-2.5 text-sm font-medium text-[#c9bd9e] transition hover:border-gold-700 hover:text-gold-200"
            >
              Keep Same &amp; Continue
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 shadow-lg shadow-gold-900/30 transition hover:from-gold-500 hover:to-gold-400"
          >
            {hasExistingRate ? "Update Rate" : "Set Today's Rate"}
          </button>
        </div>
      </div>
    </div>
  );
}
