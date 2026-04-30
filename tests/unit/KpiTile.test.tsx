import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KpiTile } from "@/components/widgets/KpiTile";

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("KpiTile", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders sample data when the backend fetch 404s", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("", { status: 404 })),
    );
    render(wrapper(
      <KpiTile widget={{ id: "abc123", kind: "kpi", title: "KPI",
        x: 0, y: 0, w: 260, h: 160 }} />,
    ));
    // kpi adapter's sample is {value: 42, unit: "%"} → "42.0%"
    await waitFor(() => expect(screen.getByText(/42\.0/)).toBeTruthy());
    expect(screen.getByText("%")).toBeTruthy();
  });
});
