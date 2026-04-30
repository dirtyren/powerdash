import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataTable } from "@/components/widgets/DataTable";

function wrapper(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DataTable", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders sample rows when backend 404s", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("", { status: 404 })),
    );
    render(wrapper(
      <DataTable widget={{ id: "abc123", kind: "table", title: "T",
        x: 0, y: 0, w: 480, h: 320 }} />,
    ));
    await waitFor(() => expect(screen.getByText("host-1")).toBeTruthy());
  });
});
