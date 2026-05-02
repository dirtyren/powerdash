export function labelFor(metric: Record<string, string>): string {
  const { __name__, ...rest } = metric;
  const tail = Object.entries(rest)
    .map(([k, v]) => `${k}="${v}"`)
    .join(", ");
  if (__name__) return tail ? `${__name__}{${tail}}` : __name__;
  return tail || "series";
}

// Prometheus encodes numbers as strings because JSON cannot round-trip
// "+Inf", "-Inf", or "NaN". parseFloat yields Infinity/NaN for those;
// coerce non-finite → null.
export function parseValue(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
