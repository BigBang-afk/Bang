"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { fetcher } from "@/lib/api";
import { useMarketSocket } from "@/lib/ws";
import { useMarketStore } from "@/store/useMarketStore";
import type { OpportunityEntry, SignalOut, TickerEntry } from "@/types";

export function useScanner() {
  const { tickers, opportunities, signals, setTickers, setOpportunities, setSignals } = useMarketStore();

  const tickersQuery = useQuery({
    queryKey: ["scanner-tickers"],
    queryFn: () => fetcher<{ results: TickerEntry[] }>("/scanner/tickers"),
    refetchInterval: 5_000,
  });

  const opportunitiesQuery = useQuery({
    queryKey: ["scanner-opportunities"],
    queryFn: () => fetcher<{ results: OpportunityEntry[] }>("/scanner/opportunities"),
    refetchInterval: 15_000,
  });

  const signalsQuery = useQuery({
    queryKey: ["signals"],
    queryFn: () => fetcher<{ results: SignalOut[] }>("/signals"),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (tickersQuery.data) setTickers(tickersQuery.data.results);
  }, [tickersQuery.data, setTickers]);

  useEffect(() => {
    if (opportunitiesQuery.data) setOpportunities(opportunitiesQuery.data.results);
  }, [opportunitiesQuery.data, setOpportunities]);

  useEffect(() => {
    if (signalsQuery.data) setSignals(signalsQuery.data.results);
  }, [signalsQuery.data, setSignals]);

  useMarketSocket((msg) => {
    if (msg.type === "tickers_snapshot") setTickers(msg.data as TickerEntry[]);
    if (msg.type === "opportunities_snapshot") setOpportunities(msg.data as OpportunityEntry[]);
    if (msg.type === "signals_snapshot") setSignals(msg.data as SignalOut[]);
  });

  return {
    tickers,
    opportunities,
    signals,
    isLoading: tickersQuery.isLoading,
  };
}
