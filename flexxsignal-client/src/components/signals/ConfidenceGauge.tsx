export function ConfidenceGauge({ value, size = 64 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 90 ? "#22c55e" : clamped >= 80 ? "#22d3ee" : clamped >= 70 ? "#facc15" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={6} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{clamped.toFixed(0)}%</span>
    </div>
  );
}
