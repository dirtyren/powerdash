import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PromKpi } from "@/components/widgets/promql/PromKpi";
import type { WidgetRef } from "@/server/schemas/widget";

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const baseWidget: WidgetRef = {
  id: "abc",
  kind: "kpi",
  title: "KPI",
  x: 0,
  y: 0,
  w: 260,
  h: 160,
};

function stubResponse(result: Array<{ metric: Record<string, string>; value: [number, string] }>) {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result } }),
        { status: 200 },
      ),
    ),
  );
}

describe("PromKpi", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders the 'no query' placeholder when widget has no query", () => {
    render(wrapper(<PromKpi widget={baseWidget} />));
    expect(screen.getByText(/No query —/)).toBeTruthy();
  });

  it("renders '42.0' for an instant vector with a single '42' value", async () => {
    stubResponse([{ metric: { __name__: "up" }, value: [1714348800, "42"] }]);
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up" } };
    render(wrapper(<PromKpi widget={widget} />));
    await waitFor(() => expect(screen.getByText("42.0")).toBeTruthy());
  });

  it("renders '—' when the instant value is NaN", async () => {
    stubResponse([{ metric: { __name__: "up" }, value: [1714348800, "NaN"] }]);
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up" } };
    render(wrapper(<PromKpi widget={widget} />));
    await waitFor(() => expect(screen.getByText("—")).toBeTruthy());
  });

  it("shows 'Showing 1 of N series' when multiple results are returned", async () => {
    stubResponse([
      { metric: { __name__: "up", instance: "a" }, value: [1, "1"] },
      { metric: { __name__: "up", instance: "b" }, value: [1, "0"] },
      { metric: { __name__: "up", instance: "c" }, value: [1, "1"] },
    ]);
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up" } };
    render(wrapper(<PromKpi widget={widget} />));
    await waitFor(() => expect(screen.getByText(/Showing 1 of 3 series/)).toBeTruthy());
  });

  it("renders 'No samples.' when the instant vector is empty", async () => {
    stubResponse([]);
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up" } };
    render(wrapper(<PromKpi widget={widget} />));
    await waitFor(() => expect(screen.getByText(/No samples/)).toBeTruthy());
  });

  it("renders 'Query failed' on non-2xx fetch", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("boom", { status: 502 })),
    );
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up" } };
    render(wrapper(<PromKpi widget={widget} />));
    await waitFor(() => expect(screen.getByText(/Query failed/)).toBeTruthy());
  });
});
