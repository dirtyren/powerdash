"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PromQLEditor } from "@/components/widgets/PromQLEditor";
import type { WidgetRef, WidgetQuery } from "@/server/schemas/widget";

interface Props {
  widget: WidgetRef;
  onApply: (next: WidgetQuery | undefined) => void;
  onBack: () => void;
}

export function QueryEditor({ widget, onApply, onBack }: Props) {
  const [expr, setExpr] = useState(widget.query?.expr ?? "");
  const [step, setStep] = useState<string>(
    widget.query?.step !== undefined ? String(widget.query.step) : "",
  );

  const trimmed = expr.trim();
  const parsedStep = step === "" ? undefined : Number(step);
  const stepInvalid =
    step !== "" && (!Number.isFinite(parsedStep) || (parsedStep as number) <= 0);

  const current = widget.query;
  const nextIsSame =
    current !== undefined &&
    trimmed === current.expr &&
    parsedStep === current.step;
  const applyDisabled = trimmed.length === 0 || stepInvalid || nextIsSame;

  const handleApply = () => {
    onApply({
      expr: trimmed,
      ...(parsedStep !== undefined ? { step: parsedStep } : {}),
    });
  };

  const handleClear = () => {
    setExpr("");
    setStep("");
    onApply(undefined);
  };

  return (
    <aside className="w-64 overflow-y-auto border-l border-border bg-card p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-xs text-muted-foreground hover:text-foreground"
      >
        ← Widgets
      </button>
      <div className="mb-3 text-sm">
        <span className="text-muted-foreground">Editing: </span>
        <span className="font-medium">{widget.title}</span>
      </div>
      <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
        PromQL expression
      </label>
      <div className="mb-3">
        <PromQLEditor
          value={expr}
          onChange={setExpr}
          onApply={handleApply}
        />
      </div>
      <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
        Step (seconds, optional)
      </label>
      <input
        aria-label="Step seconds"
        type="number"
        min={1}
        value={step}
        onChange={(e) => setStep(e.target.value)}
        className="mb-3 w-full rounded border border-border bg-background p-2 text-xs"
      />
      {stepInvalid && (
        <div className="mb-2 text-xs text-red-400">
          Step must be a positive number.
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleApply} disabled={applyDisabled}>
          Apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClear}
          disabled={!current && trimmed.length === 0}
        >
          Clear query
        </Button>
      </div>
    </aside>
  );
}
