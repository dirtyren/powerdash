import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LineChart } from "@/components/widgets/LineChart";

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("LineChart", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders without crashing when backend 404s (sample fallback)", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("", { status: 404 })),
    );
    const { container } = render(wrapper(
      <LineChart widget={{ id: "abc123", kind: "line", title: "Line",
        x: 0, y: 0, w: 480, h: 320 }} />,
    ));
    expect(container.querySelector("div")).not.toBeNull();
  });
});
