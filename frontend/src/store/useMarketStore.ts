import { create } from "zustand";
import type { OpportunityEntry, SignalOut, TickerEntry } from "@/types";

interface MarketState {
  tickers: TickerEntry[];
  opportunities: OpportunityEntry[];
  signals: SignalOut[];
  setTickers: (tickers: TickerEntry[]) => void;
  setOpportunities: (opps: OpportunityEntry[]) => void;
  setSignals: (signals: SignalOut[]) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  tickers: [],
  opportunities: [],
  signals: [],
  setTickers: (tickers) => set({ tickers }),
  setOpportunities: (opportunities) => set({ opportunities }),
  setSignals: (signals) => set({ signals }),
}));
