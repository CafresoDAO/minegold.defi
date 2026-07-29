/** Render a balance string defensively — any null/NaN/garbage input becomes "0.0000". */
export function safeBalance(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "" || val === "NaN")
    return "0.0000";
  const n = typeof val === "number" ? val : Number.parseFloat(String(val));
  return Number.isNaN(n) || !Number.isFinite(n) ? "0.0000" : String(val);
}
