// Placeholder rates only — this site has no live backend/API wired up yet.
// Swap `getTodayRates()` for a real gold-rate API call when one is available.
const BASE_RATES = [
  { label: "Gold 24K", unit: "per gram", price: 27850, trend: "up" },
  { label: "Gold 22K", unit: "per gram", price: 25530, trend: "up" },
  { label: "Gold 21K", unit: "per gram", price: 24370, trend: "down" },
  { label: "Gold 18K", unit: "per gram", price: 20890, trend: "up" },
  { label: "Silver 999", unit: "per gram", price: 335, trend: "down" },
];

export function getTodayRates() {
  return {
    asOf: new Date(),
    rates: BASE_RATES,
    indicative: true,
  };
}

export function formatRate(price) {
  return `Rs ${price.toLocaleString("en-PK")}`;
}
