"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PromQLEditor } from "@/components/widgets/PromQLEditor";
import { ModeTabs } from "@/components/widgets/ModeTabs";
import { QueryBuilder } from "@/components/widgets/QueryBuilder";
import {
  EMPTY_BUILDER_STATE,
  type BuilderState,
} from "@/widgets/promql/builder-state";
import { buildExpression } from "@/widgets/promql/build-expression";
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
  const [mode, setMode] = useState<"code" | "builder">("code");
  const [builderState, setBuilderState] =
    useState<BuilderState>(EMPTY_BUILDER_STATE);

  // Reset local state whenever the selected widget changes.
  const widgetId = widget.id;
  useEffect(() => {
    setExpr(widget.query?.expr ?? "");
    setStep(
      widget.query?.step !== undefined ? String(widget.query.step) : "",
    );
    setMode("code");
    setBuilderState(EMPTY_BUILDER_STATE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId]);

  const parsedStep = step === "" ? undefined : Number(step);
  const stepInvalid =
    step !== "" &&
    (!Number.isFinite(parsedStep) || (parsedStep as number) <= 0);

  const activeExpr =
    mode === "code" ? expr.trim() : buildExpression(builderState).trim();

  const current = widget.query;
  const nextIsSame =
    current !== undefined &&
    activeExpr === current.expr &&
    parsedStep === current.step;
  const applyDisabled = activeExpr.length === 0 || stepInvalid || nextIsSame;

  const handleApply = () => {
    onApply({
      expr: activeExpr,
      ...(parsedStep !== undefined ? { step: parsedStep } : {}),
    });
  };

  const handleClear = () => {
    setExpr("");
    setStep("");
    setBuilderState(EMPTY_BUILDER_STATE);
    setMode("code");
    onApply(undefined);
  };

  const clearDisabled =
    !current &&
    activeExpr.length === 0 &&
    builderState.metric.length === 0;

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

      <ModeTabs mode={mode} onChange={setMode} />

      {mode === "code" ? (
        <div className="my-3">
          <label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
            PromQL expression
          </label>
          <PromQLEditor value={expr} onChange={setExpr} onApply={handleApply} />
        </div>
      ) : (
        <div className="my-3">
          <QueryBuilder state={builderState} onChange={setBuilderState} />
        </div>
      )}

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
          disabled={clearDisabled}
        >
          Clear query
        </Button>
      </div>
    </aside>
  );
}
