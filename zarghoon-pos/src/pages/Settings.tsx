import { useState } from "react";
import { Save, Check, KeyRound, Store, Coins, AlertTriangle } from "lucide-react";
import { useSettingsStore } from "../store/settingsStore";
import { useGoldRateStore } from "../store/goldRateStore";
import { useAuthStore } from "../store/authStore";
import { formatDateTime } from "../lib/format";

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gold-900/25 bg-ink-900/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={16} className="text-gold-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c9bd9e]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-400">
      <Check size={13} /> Saved
    </span>
  );
}

export default function Settings() {
  const settings = useSettingsStore();
  const rates = useGoldRateStore();
  const { changePassword } = useAuthStore();

  const [shopForm, setShopForm] = useState({
    shopName: settings.shopName,
    shopTagline: settings.shopTagline,
    shopAddress: settings.shopAddress,
    shopPhone: settings.shopPhone,
    currency: settings.currency,
  });
  const [shopSaved, setShopSaved] = useState(false);

  const [rateForm, setRateForm] = useState({
    k18: rates.k18,
    k21: rates.k21,
    k22: rates.k22,
    k24: rates.k24,
  });
  const [rateSaved, setRateSaved] = useState(false);

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);

  function saveShop(e: React.FormEvent) {
    e.preventDefault();
    settings.update(shopForm);
    setShopSaved(true);
    setTimeout(() => setShopSaved(false), 2000);
  }

  function saveRates(e: React.FormEvent) {
    e.preventDefault();
    rates.setAllRates(rateForm);
    setRateSaved(true);
    setTimeout(() => setRateSaved(false), 2000);
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (pwForm.next.length < 4) {
      setPwError("New password must be at least 4 characters.");
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    const ok = changePassword(pwForm.current, pwForm.next);
    if (!ok) {
      setPwError("Current password is incorrect.");
      return;
    }
    setPwForm({ current: "", next: "", confirm: "" });
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2000);
  }

  function resetData() {
    if (!confirm("This will erase all products, sales and settings on this device. Continue?")) return;
    localStorage.clear();
    window.location.reload();
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-gold-100">Settings</h1>
        <p className="text-sm text-ink-500">Manage your shop, gold rates and account.</p>
      </div>

      <SectionCard title="Gold Rate Management" icon={Coins}>
        <p className="mb-4 text-xs text-ink-500">
          Rates last updated {rates.updatedAt ? formatDateTime(rates.updatedAt) : "never"}. The 21K rate is
          asked automatically the first time you log in each day, but you can change it here anytime.
        </p>
        <form onSubmit={saveRates} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["k18", "k21", "k22", "k24"] as const).map((key) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                {key.slice(1)}K / gram
              </span>
              <input
                type="number"
                min={0}
                value={rateForm[key] || ""}
                onChange={(e) => setRateForm((f) => ({ ...f, [key]: Number(e.target.value) || 0 }))}
                className={`input ${key === "k21" ? "border-gold-700/60" : ""}`}
              />
            </label>
          ))}
          <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
            >
              <Save size={15} /> Save Rates
            </button>
            <SavedBadge show={rateSaved} />
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Shop Information" icon={Store}>
        <form onSubmit={saveShop} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Shop Name
            </span>
            <input
              value={shopForm.shopName}
              onChange={(e) => setShopForm((f) => ({ ...f, shopName: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Tagline
            </span>
            <input
              value={shopForm.shopTagline}
              onChange={(e) => setShopForm((f) => ({ ...f, shopTagline: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Address
            </span>
            <input
              value={shopForm.shopAddress}
              onChange={(e) => setShopForm((f) => ({ ...f, shopAddress: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Phone
            </span>
            <input
              value={shopForm.shopPhone}
              onChange={(e) => setShopForm((f) => ({ ...f, shopPhone: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Currency Symbol
            </span>
            <input
              value={shopForm.currency}
              onChange={(e) => setShopForm((f) => ({ ...f, currency: e.target.value }))}
              className="input"
            />
          </label>
          <div className="col-span-1 flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
            >
              <Save size={15} /> Save Shop Info
            </button>
            <SavedBadge show={shopSaved} />
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Account Security" icon={KeyRound}>
        <form onSubmit={savePassword} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Current Password
            </span>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              New Password
            </span>
            <input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Confirm Password
            </span>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              className="input"
            />
          </label>
          {pwError && <p className="col-span-full text-xs text-rose-400">{pwError}</p>}
          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
            >
              <Save size={15} /> Update Password
            </button>
            <SavedBadge show={pwSaved} />
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Danger Zone" icon={AlertTriangle}>
        <p className="mb-4 text-xs text-ink-500">
          Permanently erase all products, sales history, gold rates and settings stored on this device.
        </p>
        <button
          onClick={resetData}
          className="rounded-lg border border-rose-800/60 px-4 py-2.5 text-sm font-medium text-rose-400 hover:bg-rose-950/30"
        >
          Reset All Data
        </button>
      </SectionCard>
    </div>
  );
}
