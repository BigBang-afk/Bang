import { statusFromNumber } from "../../types/domain";

const STATUS_STYLES: Record<string, string> = {
  Win: "badge-up", Loss: "badge-down", Tie: "badge-gold", Active: "badge bg-cyan-400/15 text-cyan-300 border border-cyan-400/40",
  Waiting: "badge-gold", Scheduled: "badge-neutral", Draft: "badge-neutral", Canceled: "badge-neutral",
  Missed: "badge-neutral", DataError: "badge-down",
};

export function ResultBadge({ status }: { status: number | string }) {
  const label = typeof status === "number" ? statusFromNumber(status) : status;
  return <span className={STATUS_STYLES[label] ?? "badge-neutral"}>{label}</span>;
}

export function DirectionBadge({ direction }: { direction: number }) {
  const isUp = direction === 0;
  return (
    <span className={isUp ? "badge-up" : "badge-down"}>
      {isUp ? "▲ UP" : "▼ DOWN"}
    </span>
  );
}
