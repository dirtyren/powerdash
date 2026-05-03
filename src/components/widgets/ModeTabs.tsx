"use client";

interface Props {
  mode: "code" | "builder";
  onChange: (m: "code" | "builder") => void;
  builderDisabled?: { reason: string };
}

export function ModeTabs({ mode, onChange, builderDisabled }: Props) {
  const builderIsDisabled = !!builderDisabled;
  return (
    <div
      role="tablist"
      aria-label="Query editor mode"
      className="mb-3 inline-flex rounded border border-border bg-card p-0.5"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "code"}
        onClick={() => onChange("code")}
        className={`rounded px-3 py-1 text-xs ${
          mode === "code"
            ? "bg-muted"
            : "text-muted-foreground hover:bg-muted/50"
        }`}
      >
        Code
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "builder"}
        aria-disabled={builderIsDisabled}
        disabled={builderIsDisabled}
        title={builderDisabled?.reason}
        onClick={() => onChange("builder")}
        className={`rounded px-3 py-1 text-xs ${
          mode === "builder"
            ? "bg-muted"
            : "text-muted-foreground hover:bg-muted/50"
        } ${builderIsDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        Builder
      </button>
    </div>
  );
}
