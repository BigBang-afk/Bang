import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  shopName: string;
  shopTagline: string;
  shopAddress: string;
  shopPhone: string;
  currency: string;
  update: (patch: Partial<Omit<SettingsState, "update">>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      shopName: "Zarghoon Jewellers",
      shopTagline: "Fine Gold & Bridal Jewellery",
      shopAddress: "Main Bazaar Road, Quetta",
      shopPhone: "+92 300 1234567",
      currency: "Rs",
      update: (patch) => set(patch),
    }),
    { name: "zarghoon-settings" }
  )
);
