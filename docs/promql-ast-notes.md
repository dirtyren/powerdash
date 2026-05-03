# PromQL Lezer AST quick reference

Verified against `@prometheus-io/lezer-promql` pinned in `pnpm-lock.yaml`
(version 0.311.3).
Update this file when the package is upgraded.

## Outer shapes recognized by `parseExpression`

| PromQL                              | Outer node       |
|-------------------------------------|------------------|
| `up`                                | `VectorSelector` |
| `up{job="foo"}`                     | `VectorSelector` |
| `rate(up[5m])`                      | `FunctionCall`   |
| `sum(up)`                           | `AggregateExpr`  |
| `sum(rate(...)[5m]) by (job)`       | `AggregateExpr`  |

## Key child relationships

- `AggregateExpr` → `AggregateOp` (name), optional `AggregateModifier` (→ `GroupingLabels` → `LabelName`), inner `Expr` wrapped in `FunctionCallBody`.
- `FunctionCall` → `FunctionIdentifier` (name), `FunctionCallBody` → argument `Expr`.
- `MatrixSelector` → inner `VectorSelector` + `NumberDurationLiteralInDurationContext`.
- `VectorSelector` → optional `Identifier` (metric name), optional `LabelMatchers` → 0..N `UnquotedLabelMatcher` (→ `LabelName` + `MatchOp` + `StringLiteral`).

## String values

`StringLiteral.text` includes the surrounding quotes. Strip + unescape via the
`unquote` helper in `src/widgets/promql/parse-expression.ts`.

## Observed drift from design

Four node names differ from the original P3.4c design spec:

| Design name        | Actual name (v0.311.3)                    |
|--------------------|-------------------------------------------|
| `MetricIdentifier` | `Identifier`                              |
| `LabelMatcher`     | `UnquotedLabelMatcher` (also `QuotedLabelMatcher` for backtick-quoted label names) |
| `Duration`         | `NumberDurationLiteralInDurationContext`  |
| `GroupingLabel`    | `LabelName`                               |

All 4 are simple renames — the tree structure is exactly as designed.
No structural absences; all shapes are represented as expected.

## Full AST dump (reference)

Captured from `node -e '...'` against the installed package.

### `up`
```
PromQL [0-2] "up"
  VectorSelector [0-2] "up"
    Identifier [0-2] "up"
```

### `up{job="prometheus"}`
```
PromQL [0-20] "up{job=\"prometheus\"}"
  VectorSelector [0-20] "up{job=\"prometheus\"}"
    Identifier [0-2] "up"
    LabelMatchers [2-20] "{job=\"prometheus\"}"
      UnquotedLabelMatcher [3-19] "job=\"prometheus\""
        LabelName [3-6] "job"
        MatchOp [6-7] "="
          EqlSingle [6-7] "="
        StringLiteral [7-19] "\"prometheus\""
```

### `rate(http_requests_total[5m])`
```
PromQL [0-29] "rate(http_requests_total[5m])"
  FunctionCall [0-29] "rate(http_requests_total[5m])"
    FunctionIdentifier [0-4] "rate"
      Rate [0-4] "rate"
    FunctionCallBody [4-29] "(http_requests_total[5m])"
      MatrixSelector [5-28] "http_requests_total[5m]"
        VectorSelector [5-24] "http_requests_total"
          Identifier [5-24] "http_requests_total"
        NumberDurationLiteralInDurationContext [25-27] "5m"
```

### `irate(up[1m])`
```
PromQL [0-13] "irate(up[1m])"
  FunctionCall [0-13] "irate(up[1m])"
    FunctionIdentifier [0-5] "irate"
      Irate [0-5] "irate"
    FunctionCallBody [5-13] "(up[1m])"
      MatrixSelector [6-12] "up[1m]"
        VectorSelector [6-8] "up"
          Identifier [6-8] "up"
        NumberDurationLiteralInDurationContext [9-11] "1m"
```

### `sum(up) by (job)`
```
PromQL [0-16] "sum(up) by (job)"
  AggregateExpr [0-16] "sum(up) by (job)"
    AggregateOp [0-3] "sum"
      Sum [0-3] "sum"
    FunctionCallBody [3-7] "(up)"
      VectorSelector [4-6] "up"
        Identifier [4-6] "up"
    AggregateModifier [8-16] "by (job)"
      By [8-10] "by"
      GroupingLabels [11-16] "(job)"
        LabelName [12-15] "job"
```

### `sum(rate(http_requests_total{job="api"}[5m])) by (method)`
```
PromQL [0-57] "sum(rate(http_requests_total{job=\"api\"}[5m])) by (method)"
  AggregateExpr [0-57] "sum(rate(http_requests_total{job=\"api\"}[5m])) by (method)"
    AggregateOp [0-3] "sum"
      Sum [0-3] "sum"
    FunctionCallBody [3-45] "(rate(http_requests_total{job=\"api\"}[5m]))"
      FunctionCall [4-44] "rate(http_requests_total{job=\"api\"}[5m])"
        FunctionIdentifier [4-8] "rate"
          Rate [4-8] "rate"
        FunctionCallBody [8-44] "(http_requests_total{job=\"api\"}[5m])"
          MatrixSelector [9-43] "http_requests_total{job=\"api\"}[5m]"
            VectorSelector [9-39] "http_requests_total{job=\"api\"}"
              Identifier [9-28] "http_requests_total"
              LabelMatchers [28-39] "{job=\"api\"}"
                UnquotedLabelMatcher [29-38] "job=\"api\""
                  LabelName [29-32] "job"
                  MatchOp [32-33] "="
                    EqlSingle [32-33] "="
                  StringLiteral [33-38] "\"api\""
            NumberDurationLiteralInDurationContext [40-42] "5m"
    AggregateModifier [46-57] "by (method)"
      By [46-48] "by"
      GroupingLabels [49-57] "(method)"
        LabelName [50-56] "method"
```
