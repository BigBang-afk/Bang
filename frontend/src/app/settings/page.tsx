"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, fetcher } from "@/lib/api";
import { useSettingsStore } from "@/store/useSettingsStore";

interface Profile {
  email: string;
  full_name: string | null;
  role: string;
  is_2fa_enabled: boolean;
  has_mexc_keys: boolean;
}

export default function SettingsPage() {
  const { data: profile, error } = useQuery({ queryKey: ["profile"], queryFn: () => fetcher<Profile>("/settings/profile") });
  const soundAlerts = useSettingsStore((s) => s.soundAlertsEnabled);
  const toggleSoundAlerts = useSettingsStore((s) => s.toggleSoundAlerts);

  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const saveKeys = useMutation({
    mutationFn: () => api.put("/settings/mexc-api-key", { mexc_api_key: apiKey, mexc_api_secret: apiSecret }),
  });

  const [telegramChatId, setTelegramChatId] = useState("");
  const testAlert = useMutation({
    mutationFn: (channel: string) => api.post("/alerts/test", { channel, destination: telegramChatId }),
  });

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-100">Settings</h1>

      <div className="card p-4">
        <h2 className="font-medium text-slate-200 mb-2">Profile</h2>
        {error && <p className="text-sm text-accent-sell">Sign in to view your profile.</p>}
        {profile && (
          <div className="text-sm text-slate-400 space-y-1">
            <p>Email: {profile.email}</p>
            <p>Role: {profile.role}</p>
            <p>2FA enabled: {profile.is_2fa_enabled ? "Yes" : "No"}</p>
            <p>MEXC API keys connected: {profile.has_mexc_keys ? "Yes" : "No"}</p>
          </div>
        )}
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-slate-200 mb-2">MEXC API Keys (optional)</h2>
        <p className="text-xs text-slate-500 mb-3">
          Encrypted at rest. Only required for private trading endpoints — market data and signals work without any keys.
        </p>
        <div className="flex flex-col gap-2">
          <input
            placeholder="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          />
          <input
            placeholder="API Secret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          />
          <button
            onClick={() => saveKeys.mutate()}
            disabled={saveKeys.isPending}
            className="bg-accent-brand text-white rounded px-4 py-1.5 text-sm font-medium self-start"
          >
            {saveKeys.isPending ? "Saving…" : "Save Keys"}
          </button>
          {saveKeys.isSuccess && <p className="text-xs text-accent-buy">Saved.</p>}
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-medium text-slate-200 mb-2">Alerts</h2>
        <label className="flex items-center gap-2 text-sm text-slate-300 mb-3">
          <input type="checkbox" checked={soundAlerts} onChange={toggleSoundAlerts} /> Sound alerts on new signals
        </label>
        <div className="flex gap-2">
          <input
            placeholder="Telegram chat ID"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm flex-1"
          />
          <button onClick={() => testAlert.mutate("telegram")} className="border border-base-700 rounded px-3 py-1.5 text-sm text-slate-300">
            Send Test
          </button>
        </div>
        {testAlert.data && <p className="text-xs mt-2 text-slate-500">{testAlert.data.data.sent ? "Sent." : "Not configured on server."}</p>}
      </div>
    </div>
  );
}
