"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/admin/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

interface Settings {
  businessName: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  openingHours: string;
  decimalPrecision: number;
  pricingUsesExtras: boolean;
  currency: string;
  weightUnit: string;
  defaultPurity: "K24" | "K21" | "K18";
  registrationEnabled: boolean;
  birthdayRemindersEnabled: boolean;
  requireMarketingConsent: boolean;
  facebookUrl: string | null;
  instagramUrl: string | null;
  whatsappUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  notifyBirthdayReminders: boolean;
  notifyNewCustomer: boolean;
  notifyNewInquiry: boolean;
  notifyGoldRateUpdate: boolean;
}

const TABS = ["Business", "Gold & Pricing", "Customers", "Social Media", "Notifications", "Security"] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>("Business");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setSettings(data.settings);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setMessage(res.ok ? "Settings saved." : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-brown-light">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Settings</h1>
      <div className="flex flex-wrap gap-2 border-b border-gold/20 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${tab === t ? "border-maroon bg-maroon text-cream" : "border-cream-dark text-brown-light"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}

      {tab === "Business" && (
        <Card title="Business Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Business Name" value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <ImageUploadField label="Logo" value={settings.logoUrl ?? ""} onChange={(url) => setSettings({ ...settings, logoUrl: url })} subdir="branding" />
            </div>
            <Textarea label="Address" rows={2} value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="sm:col-span-2" />
            <Input label="Phone" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
            <Input label="WhatsApp Number" value={settings.whatsapp} onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })} />
            <Input label="Email" type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} />
            <Input label="Opening Hours" value={settings.openingHours} onChange={(e) => setSettings({ ...settings, openingHours: e.target.value })} />
          </div>
          <Button className="mt-4" loading={saving} onClick={save}>Save</Button>
        </Card>
      )}

      {tab === "Gold & Pricing" && (
        <Card title="Gold &amp; Product Pricing Rules">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Decimal Precision" type="number" min={0} max={4} value={settings.decimalPrecision} onChange={(e) => setSettings({ ...settings, decimalPrecision: Number(e.target.value) })} />
            <Select label="Default Purity" value={settings.defaultPurity} onChange={(e) => setSettings({ ...settings, defaultPurity: e.target.value as Settings["defaultPurity"] })}>
              <option value="K24">24K</option>
              <option value="K21">21K</option>
              <option value="K18">18K</option>
            </Select>
            <Input label="Currency" value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} />
            <Input label="Weight Unit" value={settings.weightUnit} onChange={(e) => setSettings({ ...settings, weightUnit: e.target.value })} />
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.pricingUsesExtras} onChange={(e) => setSettings({ ...settings, pricingUsesExtras: e.target.checked })} className="h-4 w-4 accent-maroon" />
            Enable optional charges (Making, Stone, Other, Discount, Tax) in product pricing
          </label>
          <Button className="mt-4" loading={saving} onClick={save}>Save</Button>
        </Card>
      )}

      {tab === "Customers" && (
        <Card title="Customer Settings">
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.registrationEnabled} onChange={(e) => setSettings({ ...settings, registrationEnabled: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Allow new customer registration
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.birthdayRemindersEnabled} onChange={(e) => setSettings({ ...settings, birthdayRemindersEnabled: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Enable birthday reminders
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.requireMarketingConsent} onChange={(e) => setSettings({ ...settings, requireMarketingConsent: e.target.checked })} className="h-4 w-4 accent-maroon" />
              Require explicit marketing consent at registration
            </label>
          </div>
          <Button className="mt-4" loading={saving} onClick={save}>Save</Button>
        </Card>
      )}

      {tab === "Social Media" && (
        <Card title="Social Media Links">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Facebook URL" value={settings.facebookUrl ?? ""} onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })} />
            <Input label="Instagram URL" value={settings.instagramUrl ?? ""} onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })} />
            <Input label="WhatsApp Link" value={settings.whatsappUrl ?? ""} onChange={(e) => setSettings({ ...settings, whatsappUrl: e.target.value })} />
            <Input label="YouTube URL" value={settings.youtubeUrl ?? ""} onChange={(e) => setSettings({ ...settings, youtubeUrl: e.target.value })} />
            <Input label="TikTok URL" value={settings.tiktokUrl ?? ""} onChange={(e) => setSettings({ ...settings, tiktokUrl: e.target.value })} />
          </div>
          <Button className="mt-4" loading={saving} onClick={save}>Save</Button>
        </Card>
      )}

      {tab === "Notifications" && (
        <Card title="Notification Settings">
          <div className="flex flex-col gap-3">
            {([
              ["notifyBirthdayReminders", "Birthday reminders"],
              ["notifyNewCustomer", "New customer registrations"],
              ["notifyNewInquiry", "New orders / inquiries"],
              ["notifyGoldRateUpdate", "Gold rate updates"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} className="h-4 w-4 accent-maroon" />
                {label}
              </label>
            ))}
          </div>
          <Button className="mt-4" loading={saving} onClick={save}>Save</Button>
        </Card>
      )}

      {tab === "Security" && <SecurityTab />}
    </div>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/security/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to change password.");
        return;
      }
      setMessage("Password updated successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Change Admin Password">
      <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
        <Input label="Current Password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <Input label="New Password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} hint="At least 8 characters." />
        <Input label="Confirm New Password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}
        <Button type="submit" loading={saving} className="self-start">Update Password</Button>
      </form>
      <p className="mt-6 max-w-md text-xs text-brown-light">
        Sessions expire automatically after 8 hours (30 days if &quot;remember session&quot; is
        checked at login). All admin actions are recorded in Admin Activity for audit purposes.
      </p>
    </Card>
  );
}
