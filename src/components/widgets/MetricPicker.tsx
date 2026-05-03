"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  metrics: string[];
  placeholder?: string;
  disabled?: boolean;
}

const MAX_VISIBLE = 200;

export function MetricPicker({
  value,
  onChange,
  metrics,
  placeholder,
  disabled,
}: Props) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return metrics.slice(0, MAX_VISIBLE);
    return metrics.filter((m) => m.toLowerCase().includes(q)).slice(0, MAX_VISIBLE);
  }, [query, metrics]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const commit = (next: string) => {
    onChange(next);
    setQuery(next);
    setOpen(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIdx];
      if (target !== undefined) commit(target);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? "Select a metric…"}
        disabled={disabled}
        className="w-full rounded border border-border bg-background p-2 text-xs"
      />
      {open && filtered.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded border border-border bg-card shadow"
        >
          {filtered.map((m, i) => (
            <li
              key={m}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(m);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "cursor-pointer px-2 py-1 text-xs",
                i === activeIdx ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
