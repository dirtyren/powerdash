"use client";

import { useMemo } from "react";
import type {
  BuilderState,
  LabelFilter,
  LabelOp,
  AggregationFn,
  GroupKind,
} from "@/widgets/promql/builder-state";
import { buildExpression } from "@/widgets/promql/build-expression";
import {
  useMetricNames,
  useLabelNames,
  useLabelValues,
} from "@/hooks/usePromMetadata";

interface Props {
  state: BuilderState;
  onChange: (next: BuilderState) => void;
}

const OPS: readonly LabelOp[] = ["=", "!=", "=~", "!~"];
const AGG_FNS: readonly AggregationFn[] = [
  "sum",
  "avg",
  "max",
  "min",
  "count",
  "stddev",
  "stdvar",
];

export function QueryBuilder({ state, onChange }: Props) {
  const preview = useMemo(() => buildExpression(state), [state]);
  return (
    <div className="flex flex-col gap-4">
      <MetricSection state={state} onChange={onChange} />
      <FiltersSection state={state} onChange={onChange} />
      <RateSection state={state} onChange={onChange} />
      <AggregationSection state={state} onChange={onChange} />
      <PreviewBox expr={preview} />
    </div>
  );
}

function MetricSection({ state, onChange }: Props) {
  const { data: metrics = [] } = useMetricNames();
  return (
    <section>
      <label
        htmlFor="builder-metric"
        className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground"
      >
        Metric
      </label>
      <select
        id="builder-metric"
        aria-label="Metric"
        value={state.metric}
        onChange={(e) => onChange({ ...state, metric: e.target.value })}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
      >
        <option value="">(pick metric)</option>
        {metrics.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </section>
  );
}

function FiltersSection({ state, onChange }: Props) {
  const addRow = () =>
    onChange({
      ...state,
      filters: [...state.filters, { label: "", op: "=", value: "" }],
    });
  const updateRow = (i: number, patch: Partial<LabelFilter>) =>
    onChange({
      ...state,
      filters: state.filters.map((f, idx) =>
        idx === i ? { ...f, ...patch } : f,
      ),
    });
  const removeRow = (i: number) =>
    onChange({
      ...state,
      filters: state.filters.filter((_, idx) => idx !== i),
    });

  return (
    <section>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Label filters
        </span>
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-primary hover:underline"
        >
          + add
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {state.filters.map((f, i) => (
          <FilterRow
            key={i}
            filter={f}
            onChange={(patch) => updateRow(i, patch)}
            onRemove={() => removeRow(i)}
          />
        ))}
      </div>
    </section>
  );
}

function FilterRow({
  filter,
  onChange,
  onRemove,
}: {
  filter: LabelFilter;
  onChange: (patch: Partial<LabelFilter>) => void;
  onRemove: () => void;
}) {
  const { data: labels = [] } = useLabelNames();
  const { data: values = [] } = useLabelValues(filter.label || null);
  const listId = `values-${filter.label || "any"}`;
  return (
    <div className="flex items-center gap-1">
      <select
        aria-label="Label"
        value={filter.label}
        onChange={(e) => onChange({ label: e.target.value })}
        className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-1 text-xs"
      >
        <option value="">(label)</option>
        {labels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        aria-label="Operator"
        value={filter.op}
        onChange={(e) => onChange({ op: e.target.value as LabelOp })}
        className="rounded border border-border bg-background px-1 py-1 text-xs"
      >
        {OPS.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
      <input
        aria-label="Value"
        list={listId}
        value={filter.value}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder="value"
        className="min-w-0 flex-1 rounded border border-border bg-background px-1 py-1 text-xs"
      />
      <datalist id={listId}>
        {values.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <button
        type="button"
        aria-label="Remove filter"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}

function RateSection({ state, onChange }: Props) {
  const enabled = !!state.rate;
  const toggle = () => {
    if (enabled) {
      onChange({ metric: state.metric, filters: state.filters, ...(state.aggregation ? { aggregation: state.aggregation } : {}) });
    } else {
      onChange({ ...state, rate: { kind: "rate", interval: "5m" } });
    }
  };
  return (
    <section>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={enabled} onChange={toggle} />
        <span>Wrap in rate / irate</span>
      </label>
      {state.rate && (
        <div className="mt-1 flex items-center gap-1">
          <select
            aria-label="Rate function"
            value={state.rate.kind}
            onChange={(e) =>
              onChange({
                ...state,
                rate: {
                  ...state.rate!,
                  kind: e.target.value as "rate" | "irate",
                },
              })
            }
            className="rounded border border-border bg-background px-1 py-1 text-xs"
          >
            <option value="rate">rate</option>
            <option value="irate">irate</option>
          </select>
          <input
            aria-label="Interval"
            value={state.rate.interval}
            onChange={(e) =>
              onChange({
                ...state,
                rate: { ...state.rate!, interval: e.target.value },
              })
            }
            placeholder="5m"
            className="w-16 rounded border border-border bg-background px-1 py-1 text-xs"
          />
        </div>
      )}
    </section>
  );
}

function AggregationSection({ state, onChange }: Props) {
  const enabled = !!state.aggregation;
  const toggle = () => {
    if (enabled) {
      onChange({ metric: state.metric, filters: state.filters, ...(state.rate ? { rate: state.rate } : {}) });
    } else {
      onChange({
        ...state,
        aggregation: { fn: "sum", groupKind: "none", groupLabels: [] },
      });
    }
  };
  return (
    <section>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={enabled} onChange={toggle} />
        <span>Aggregation</span>
      </label>
      {state.aggregation && (
        <div className="mt-1 flex flex-col gap-1">
          <select
            aria-label="Aggregation function"
            value={state.aggregation.fn}
            onChange={(e) =>
              onChange({
                ...state,
                aggregation: {
                  ...state.aggregation!,
                  fn: e.target.value as AggregationFn,
                },
              })
            }
            className="rounded border border-border bg-background px-1 py-1 text-xs"
          >
            {AGG_FNS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            aria-label="Group kind"
            value={state.aggregation.groupKind}
            onChange={(e) =>
              onChange({
                ...state,
                aggregation: {
                  ...state.aggregation!,
                  groupKind: e.target.value as GroupKind,
                },
              })
            }
            className="rounded border border-border bg-background px-1 py-1 text-xs"
          >
            <option value="none">(no by/without)</option>
            <option value="by">by</option>
            <option value="without">without</option>
          </select>
          {state.aggregation.groupKind !== "none" && (
            <input
              aria-label="Group labels"
              value={state.aggregation.groupLabels.join(", ")}
              onChange={(e) =>
                onChange({
                  ...state,
                  aggregation: {
                    ...state.aggregation!,
                    groupLabels: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0),
                  },
                })
              }
              placeholder="label1, label2"
              className="rounded border border-border bg-background px-1 py-1 text-xs"
            />
          )}
        </div>
      )}
    </section>
  );
}

function PreviewBox({ expr }: { expr: string }) {
  return (
    <section>
      <label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">
        Preview
      </label>
      <code className="block overflow-x-auto rounded border border-border bg-background p-2 font-mono text-xs">
        {expr || "(pick a metric)"}
      </code>
    </section>
  );
}
