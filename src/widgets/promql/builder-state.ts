export type LabelOp = "=" | "!=" | "=~" | "!~";

export interface LabelFilter {
  label: string;
  op: LabelOp;
  value: string;
}

export type AggregationFn =
  | "sum"
  | "avg"
  | "max"
  | "min"
  | "count"
  | "stddev"
  | "stdvar";

export type GroupKind = "none" | "by" | "without";

export interface Aggregation {
  fn: AggregationFn;
  groupKind: GroupKind;
  groupLabels: string[];
}

export interface RateWrap {
  kind: "rate" | "irate";
  interval: string;
}

export interface BuilderState {
  metric: string;
  filters: LabelFilter[];
  aggregation?: Aggregation;
  rate?: RateWrap;
}

export const EMPTY_BUILDER_STATE: BuilderState = {
  metric: "",
  filters: [],
};
