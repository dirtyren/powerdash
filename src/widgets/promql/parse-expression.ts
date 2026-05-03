import { parser as promQLParser } from "@prometheus-io/lezer-promql";
import type {
  BuilderState,
  LabelFilter,
  LabelOp,
  AggregationFn,
  GroupKind,
} from "./builder-state";

// Derive the SyntaxNode type from the parser's public API instead of depending
// on `@lezer/common` directly (not a declared package dependency).
type SyntaxNode = ReturnType<typeof promQLParser.parse>["topNode"];

const AGG_FNS: ReadonlySet<string> = new Set<AggregationFn>([
  "sum",
  "avg",
  "max",
  "min",
  "count",
  "stddev",
  "stdvar",
]);
const LABEL_OPS: ReadonlySet<string> = new Set<LabelOp>([
  "=",
  "!=",
  "=~",
  "!~",
]);

function unquote(raw: string): string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw;
    }
  }
  if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) {
    const inner = raw
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/(?<!\\)"/g, '\\"');
    try {
      return JSON.parse('"' + inner + '"') as string;
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

function text(code: string, node: SyntaxNode): string {
  return code.slice(node.from, node.to);
}

function treeHasError(root: SyntaxNode): boolean {
  let found = false;
  const cursor = root.cursor();
  cursor.iterate((n: { type: { isError: boolean } }) => {
    if (n.type.isError) {
      found = true;
      return false;
    }
    return undefined;
  });
  return found;
}

// Walk past wrappers like PromQL / Expr / ParenExpr to the first meaningful node.
function firstMeaningful(node: SyntaxNode): SyntaxNode | null {
  let cur: SyntaxNode | null = node;
  while (
    cur &&
    (cur.type.name === "PromQL" ||
      cur.type.name === "Expr" ||
      cur.type.name === "ParenExpr")
  ) {
    const first: SyntaxNode | null = cur.firstChild;
    if (!first) return null;
    cur = first;
  }
  return cur;
}

export function parseExpression(code: string): BuilderState | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const tree = promQLParser.parse(trimmed);
  if (treeHasError(tree.topNode)) return null;

  const top = firstMeaningful(tree.topNode);
  if (!top) return null;

  return parseOuter(trimmed, top);
}

function parseOuter(code: string, node: SyntaxNode): BuilderState | null {
  switch (node.type.name) {
    case "AggregateExpr":
      return parseAggregate(code, node);
    case "FunctionCall":
      return parseRateFunction(code, node);
    case "VectorSelector":
      return parseSelector(code, node);
    default:
      return null;
  }
}

function parseAggregate(code: string, node: SyntaxNode): BuilderState | null {
  const opNode = node.getChild("AggregateOp");
  if (!opNode) return null;
  const fnName = text(code, opNode);
  if (!AGG_FNS.has(fnName)) return null;
  const fn = fnName as AggregationFn;

  // Modifier (by/without) — optional.
  const modifier = node.getChild("AggregateModifier");
  let groupKind: GroupKind = "none";
  const groupLabels: string[] = [];
  if (modifier) {
    const modText = text(code, modifier).trimStart();
    if (modText.startsWith("by")) groupKind = "by";
    else if (modText.startsWith("without")) groupKind = "without";
    else return null;
    const labelsNode = modifier.getChild("GroupingLabels");
    if (labelsNode) {
      for (
        let child: SyntaxNode | null = labelsNode.firstChild;
        child;
        child = child.nextSibling
      ) {
        if (child.type.name === "LabelName") {
          groupLabels.push(text(code, child));
        }
      }
    }
  }

  // Argument — recurse. Inside AggregateExpr the argument is wrapped in a
  // FunctionCallBody node (same as FunctionCall).
  const inner = findAggregateInner(node);
  if (!inner) return null;
  const innerMeaningful = firstMeaningful(inner);
  if (!innerMeaningful) return null;
  const innerState = parseOuter(code, innerMeaningful);
  if (!innerState) return null;
  if (innerState.aggregation) return null;

  return {
    ...innerState,
    aggregation: { fn, groupKind, groupLabels },
  };
}

function findAggregateInner(aggNode: SyntaxNode): SyntaxNode | null {
  // Direct children are: AggregateOp, FunctionCallBody (wraps the argument
  // expression), optional AggregateModifier. Walk until we find the body-like
  // container and take its firstChild.
  for (
    let child: SyntaxNode | null = aggNode.firstChild;
    child;
    child = child.nextSibling
  ) {
    const n = child.type.name;
    if (n === "AggregateOp" || n === "AggregateModifier") continue;
    if (
      n === "FunctionCallBody" ||
      n === "FunctionCallArgs" ||
      n === "ParenExpr"
    ) {
      return child.firstChild ?? null;
    }
    return child;
  }
  return null;
}

function parseRateFunction(
  code: string,
  node: SyntaxNode,
): BuilderState | null {
  const idNode = node.getChild("FunctionIdentifier");
  if (!idNode) return null;
  const fnName = text(code, idNode);
  if (fnName !== "rate" && fnName !== "irate") return null;

  const body =
    node.getChild("FunctionCallBody") ?? node.getChild("FunctionCallArgs");
  const arg: SyntaxNode | null = body ? body.firstChild : null;
  if (!arg) return null;

  const matrixNode = arg.type.name === "MatrixSelector" ? arg : null;
  if (!matrixNode) return null;

  const durationNode = matrixNode.getChild(
    "NumberDurationLiteralInDurationContext",
  );
  const selectorNode = matrixNode.getChild("VectorSelector");
  if (!durationNode || !selectorNode) return null;

  const inner = parseSelector(code, selectorNode);
  if (!inner) return null;
  if (inner.rate || inner.aggregation) return null;

  return {
    ...inner,
    rate: { kind: fnName, interval: text(code, durationNode) },
  };
}

function parseSelector(code: string, node: SyntaxNode): BuilderState | null {
  const metricNode = node.getChild("Identifier");
  if (!metricNode) return null;
  const metric = text(code, metricNode);
  if (!metric) return null;

  const filters: LabelFilter[] = [];
  const matchers = node.getChild("LabelMatchers");
  if (matchers) {
    for (
      let m: SyntaxNode | null = matchers.firstChild;
      m;
      m = m.nextSibling
    ) {
      const mName = m.type.name;
      if (mName !== "UnquotedLabelMatcher" && mName !== "QuotedLabelMatcher") {
        continue;
      }
      const labelNode = m.getChild("LabelName");
      const opNode = m.getChild("MatchOp");
      const valueNode = m.getChild("StringLiteral");
      if (!labelNode || !opNode || !valueNode) return null;
      const op = text(code, opNode);
      if (!LABEL_OPS.has(op)) return null;
      filters.push({
        label: text(code, labelNode),
        op: op as LabelOp,
        value: unquote(text(code, valueNode)),
      });
    }
  }

  return { metric, filters };
}
