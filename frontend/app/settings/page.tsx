"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";

interface ApiKey {
  id: string;
  label: string;
  exchange: string;
  is_active: boolean;
  read_only: boolean;
  created_at: string;
}

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("default");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [readOnly, setReadOnly] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadKeys = () => api.get<ApiKey[]>("/settings/api-keys").then(setKeys).catch(() => {});

  useEffect(() => {
    loadKeys();
  }, []);

  const addKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/settings/api-keys", { label, api_key: apiKey, api_secret: apiSecret, read_only: readOnly });
      setApiKey("");
      setApiSecret("");
      loadKeys();
    } finally {
      setSaving(false);
    }
  };

  const removeKey = async (id: string) => {
    await api.delete(`/settings/api-keys/${id}`);
    loadKeys();
  };

  return (
    <AppShell title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-1">MEXC API Keys</h3>
          <p className="text-xs text-gray-400 mb-4">
            Credentials are encrypted at rest and never displayed again after saving. Use read-only keys unless
            you intend to place trades from the platform.
          </p>

          <form onSubmit={addKey} className="space-y-3 mb-6">
            <input
              placeholder="Label"
              className="input-field w-full"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              placeholder="API Key"
              required
              className="input-field w-full"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <input
              placeholder="API Secret"
              required
              type="password"
              className="input-field w-full"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
              Read-only (no trading permissions)
            </label>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? "Saving..." : "Add API Key"}
            </button>
          </form>

          <ul className="space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between bg-charcoal rounded-lg px-3 py-2 text-sm">
                <div>
                  <span className="text-white font-medium">{k.label}</span>
                  <span className="text-gray-500 ml-2 uppercase text-xs">{k.exchange}</span>
                  {k.read_only && <span className="badge-long ml-2">Read-only</span>}
                </div>
                <button onClick={() => removeKey(k.id)} className="text-bear text-xs hover:underline">
                  Remove
                </button>
              </li>
            ))}
            {keys.length === 0 && <li className="text-gray-500 text-sm">No API keys added yet.</li>}
          </ul>
        </div>

        <div className="card">
          <h3 className="font-semibold text-white mb-1">Security</h3>
          <p className="text-xs text-gray-400 mb-4">Two-factor authentication adds a TOTP code requirement at login.</p>
          <button className="btn-secondary w-full">Manage 2FA</button>
        </div>
      </div>
    </AppShell>
  );
}
