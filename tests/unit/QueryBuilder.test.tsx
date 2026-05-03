import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QueryBuilder } from "@/components/widgets/QueryBuilder";
import {
  EMPTY_BUILDER_STATE,
  type BuilderState,
} from "@/widgets/promql/builder-state";

vi.mock("@/widgets/promql/prom-client", () => ({
  createPromClient: () => ({
    metricNames: () => Promise.resolve(["up", "http_requests_total"]),
    labelNames: () => Promise.resolve(["job", "instance", "method"]),
    labelValues: (name: string) =>
      Promise.resolve(
        name === "job"
          ? ["prometheus", "api"]
          : name === "method"
            ? ["GET", "POST"]
            : [],
      ),
    metricMetadata: () => Promise.resolve({}),
    series: () => Promise.resolve([]),
    flags: () => Promise.resolve({}),
  }),
}));

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("QueryBuilder", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders the metric dropdown populated from the hook", async () => {
    render(wrapper(<QueryBuilder state={EMPTY_BUILDER_STATE} onChange={() => {}} />));
    const metric = await screen.findByRole<HTMLInputElement>("combobox");
    fireEvent.focus(metric);
    await waitFor(() =>
      expect(screen.getAllByRole("option").length).toBeGreaterThan(1),
    );
    const optionNames = screen.getAllByRole("option").map((o) => o.textContent);
    expect(optionNames).toContain("up");
    expect(optionNames).toContain("http_requests_total");
  });

  it("selecting a metric fires onChange with state.metric set", async () => {
    const onChange = vi.fn();
    render(wrapper(<QueryBuilder state={EMPTY_BUILDER_STATE} onChange={onChange} />));
    const metric = await screen.findByRole("combobox");
    fireEvent.focus(metric);
    await waitFor(() =>
      expect(screen.getAllByRole("option").length).toBeGreaterThan(1),
    );
    fireEvent.mouseDown(screen.getByRole("option", { name: "up" }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_BUILDER_STATE, metric: "up" });
  });

  it("+ add appends a filter row; × removes it", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      wrapper(<QueryBuilder state={EMPTY_BUILDER_STATE} onChange={onChange} />),
    );
    fireEvent.click(screen.getByRole("button", { name: "+ add" }));
    expect(onChange).toHaveBeenCalledWith({
      metric: "",
      filters: [{ label: "", op: "=", value: "" }],
    });

    const withRow: BuilderState = {
      metric: "",
      filters: [{ label: "job", op: "=", value: "api" }],
    };
    rerender(wrapper(<QueryBuilder state={withRow} onChange={onChange} />));
    fireEvent.click(screen.getByRole("button", { name: "Remove filter" }));
    expect(onChange).toHaveBeenLastCalledWith({ metric: "", filters: [] });
  });

  it("toggling rate adds a default rate wrap", () => {
    const onChange = vi.fn();
    render(wrapper(<QueryBuilder state={EMPTY_BUILDER_STATE} onChange={onChange} />));
    fireEvent.click(screen.getByLabelText(/Wrap in rate/));
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_BUILDER_STATE,
      rate: { kind: "rate", interval: "5m" },
    });
  });

  it("toggling aggregation adds a default aggregation", () => {
    const onChange = vi.fn();
    render(wrapper(<QueryBuilder state={EMPTY_BUILDER_STATE} onChange={onChange} />));
    fireEvent.click(screen.getByLabelText("Aggregation"));
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_BUILDER_STATE,
      aggregation: { fn: "sum", groupKind: "none", groupLabels: [] },
    });
  });

  it("changing group kind to 'by' and typing labels propagates to state", () => {
    const onChange = vi.fn();
    const s: BuilderState = {
      metric: "up",
      filters: [],
      aggregation: { fn: "sum", groupKind: "none", groupLabels: [] },
    };
    render(wrapper(<QueryBuilder state={s} onChange={onChange} />));
    fireEvent.change(screen.getByRole("combobox", { name: "Group kind" }), {
      target: { value: "by" },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...s,
      aggregation: { fn: "sum", groupKind: "by", groupLabels: [] },
    });
  });

  it("renders a preview of the current expression", () => {
    const s: BuilderState = {
      metric: "up",
      filters: [{ label: "job", op: "=", value: "prometheus" }],
    };
    render(wrapper(<QueryBuilder state={s} onChange={() => {}} />));
    expect(screen.getByText('up{job="prometheus"}')).toBeTruthy();
  });

  it("shows a placeholder in preview when metric is empty", () => {
    render(wrapper(<QueryBuilder state={EMPTY_BUILDER_STATE} onChange={() => {}} />));
    expect(screen.getByText("(pick a metric)")).toBeTruthy();
  });
});
