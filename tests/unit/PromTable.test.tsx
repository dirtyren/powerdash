import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PromTable } from "@/components/widgets/promql/PromTable";
import type { WidgetRef } from "@/server/schemas/widget";

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const baseWidget: WidgetRef = {
  id: "abc",
  kind: "table",
  title: "Table",
  x: 0,
  y: 0,
  w: 480,
  h: 320,
  query: { expr: "up" },
};

function stubResponse(
  result: Array<{ metric: Record<string, string>; value: [number, string] }>,
) {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(
      new Response(
        JSON.stringify({ status: "success", data: { resultType: "vector", result } }),
        { status: 200 },
      ),
    ),
  );
}

describe("PromTable", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders 'No samples.' for empty result", async () => {
    stubResponse([]);
    render(wrapper(<PromTable widget={baseWidget} />));
    await waitFor(() => expect(screen.getByText(/No samples/)).toBeTruthy());
  });

  it("renders columns as sorted union of label keys plus 'Value'", async () => {
    stubResponse([
      {
        metric: { __name__: "up", instance: "a", job: "prometheus" },
        value: [1, "1"],
      },
      {
        metric: { __name__: "up", region: "us-east" },
        value: [1, "0"],
      },
    ]);
    render(wrapper(<PromTable widget={baseWidget} />));
    await waitFor(() => expect(screen.getByText("instance")).toBeTruthy());
    // Sorted alphabetically: instance, job, region, Value
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["instance", "job", "region", "Value"]);
  });

  it("renders rows with matching cells and '—' for NaN", async () => {
    stubResponse([
      { metric: { job: "prometheus" }, value: [1, "1.234567"] },
      { metric: { job: "worker" }, value: [1, "NaN"] },
    ]);
    render(wrapper(<PromTable widget={baseWidget} />));
    await waitFor(() => expect(screen.getByText("prometheus")).toBeTruthy());
    // 3-decimal rendering on happy path
    expect(screen.getByText("1.235")).toBeTruthy();
    // NaN → "—"
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("fills missing labels with empty cells", async () => {
    stubResponse([
      { metric: { a: "x", b: "y" }, value: [1, "1"] },
      { metric: { a: "z" }, value: [1, "2"] },
    ]);
    render(wrapper(<PromTable widget={baseWidget} />));
    await waitFor(() => expect(screen.getByText("z")).toBeTruthy());
    // Header row + 2 data rows = 3
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(3);
  });
});
