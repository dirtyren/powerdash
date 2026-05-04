"use client";

import type { RefreshIntervalMs } from "@/contexts/RefreshIntervalContext";

interface Option {
  label: string;
  value: RefreshIntervalMs;
}

const OPTIONS: readonly Option[] = [
  { label: "Off", value: null },
  { label: "5s", value: 5_000 },
  { label: "30s", value: 30_000 },
  { label: "1m", value: 60_000 },
  { label: "5m", value: 300_000 },
  { label: "15m", value: 900_000 },
];

function toSelectValue(v: RefreshIntervalMs): string {
  return v === null ? "off" : String(v);
}

function fromSelectValue(s: string): RefreshIntervalMs {
  if (s === "off") return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

interface Props {
  value: RefreshIntervalMs;
  onChange: (v: RefreshIntervalMs) => void;
}

export function RefreshIntervalSelect({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Refresh</span>
      <select
        aria-label="Refresh interval"
        className="rounded border border-border bg-background px-2 py-1 text-sm text-foreground"
        value={toSelectValue(value)}
        onChange={(e) => onChange(fromSelectValue(e.target.value))}
      >
        {OPTIONS.map((o) => (
          <option key={toSelectValue(o.value)} value={toSelectValue(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
