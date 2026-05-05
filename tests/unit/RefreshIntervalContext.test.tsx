import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RefreshIntervalProvider,
  useRefreshInterval,
} from "@/contexts/RefreshIntervalContext";

function Probe() {
  const v = useRefreshInterval();
  return <span data-testid="probe">{v === null ? "null" : String(v)}</span>;
}

describe("RefreshIntervalContext", () => {
  it("returns null when no provider is mounted", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("null");
  });

  it("returns the provider value", () => {
    render(
      <RefreshIntervalProvider value={30_000}>
        <Probe />
      </RefreshIntervalProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("30000");
  });

  it("returns null when the provider value is null (Off)", () => {
    render(
      <RefreshIntervalProvider value={null}>
        <Probe />
      </RefreshIntervalProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("null");
  });
});
