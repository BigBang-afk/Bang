import { useQueryClient } from "@tanstack/react-query";
import { useSignalRConnection, useHubEvent } from "../lib/signalr";
import { useToastStore } from "../store/uiStore";
import { showBrowserNotification } from "../components/signals/CountdownTimer";

/** Keeps live-signal queries fresh in real time and surfaces a toast + optional browser
 * notification whenever a new signal or a result comes in. */
export function useSignalRealtimeInvalidation() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  useSignalRConnection();

  const invalidateSignals = () => {
    queryClient.invalidateQueries({ queryKey: ["live-signals"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  useHubEvent<{ signalId: string }>("NewSignal", () => {
    invalidateSignals();
    pushToast("New signal published.", "info");
    showBrowserNotification("New FlexX Signal", "A new high-confidence signal is available.");
  });

  useHubEvent<{ signalId: string }>("SignalActivated", () => {
    invalidateSignals();
  });

  useHubEvent<{ signalId: string; outcome: string }>("SignalResult", (payload) => {
    invalidateSignals();
    queryClient.invalidateQueries({ queryKey: ["signal", payload.signalId] });
    pushToast(`Signal result: ${payload.outcome}`, payload.outcome === "Win" ? "success" : payload.outcome === "Loss" ? "error" : "info");
  });

  useHubEvent("Announcement", () => {
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
  });
}
