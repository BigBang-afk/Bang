export function resolveReportRange(range: string | undefined, fromStr?: string, toStr?: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === "week") {
    const day = startOfToday.getDay();
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - ((day + 6) % 7));
    return { from: start, to: startOfToday, label: "This Week" };
  }
  if (range === "year") {
    return { from: new Date(now.getFullYear(), 0, 1), to: startOfToday, label: `${now.getFullYear()}` };
  }
  if (range === "custom" && fromStr && toStr) {
    return { from: new Date(fromStr), to: new Date(toStr), label: `${fromStr} to ${toStr}` };
  }
  if (range === "today") {
    return { from: startOfToday, to: startOfToday, label: "Today" };
  }
  // default month
  return {
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: startOfToday,
    label: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}
