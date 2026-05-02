import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PromGauge } from "@/components/widgets/promql/PromGauge";
import type { WidgetRef } from "@/server/schemas/widget";

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("PromGauge", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders without crashing for a single-result instant vector", () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              resultType: "vector",
              result: [
                { metric: { __name__: "up" }, value: [1714348800, "0.62"] },
              ],
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const widget: WidgetRef = {
      id: "abc",
      kind: "gauge",
      title: "Gauge",
      x: 0,
      y: 0,
      w: 320,
      h: 260,
      query: { expr: "up" },
    };
    const { container } = render(wrapper(<PromGauge widget={widget} />));
    expect(container.querySelector("div")).not.toBeNull();
  });
});
