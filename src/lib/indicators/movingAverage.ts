export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  }
  return out;
}

export function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length === 0) return out;
  const k = 2 / (period + 1);
  const seedIdx = Math.min(period - 1, values.length - 1);
  const seedSlice = values.slice(0, seedIdx + 1);
  let prev = seedSlice.reduce((a, b) => a + b, 0) / seedSlice.length;
  out[seedIdx] = prev;
  for (let i = seedIdx + 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function last(values: number[]): number {
  return values[values.length - 1];
}
