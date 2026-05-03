import type { BuilderState } from "./builder-state";

export function buildExpression(s: BuilderState): string {
  if (!s.metric) return "";

  // Step 1: metric{filters}. Drop filter rows with blank label or empty value.
  const filterStr = s.filters
    .filter((f) => f.label && f.value !== "")
    .map((f) => `${f.label}${f.op}${JSON.stringify(f.value)}`)
    .join(", ");
  let expr = filterStr ? `${s.metric}{${filterStr}}` : s.metric;

  // Step 2: optional rate/irate wrap with range selector.
  if (s.rate) {
    expr = `${s.rate.kind}(${expr}[${s.rate.interval}])`;
  }

  // Step 3: optional aggregation wrap with by/without clause.
  if (s.aggregation) {
    const { fn, groupKind, groupLabels } = s.aggregation;
    const group =
      groupKind === "none" || groupLabels.length === 0
        ? ""
        : ` ${groupKind} (${groupLabels.join(", ")})`;
    expr = `${fn}(${expr})${group}`;
  }

  return expr;
}
