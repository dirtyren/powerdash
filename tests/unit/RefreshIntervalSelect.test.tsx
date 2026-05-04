import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RefreshIntervalSelect } from "@/components/RefreshIntervalSelect";

describe("RefreshIntervalSelect", () => {
  it("renders all six options in the expected order", () => {
    render(<RefreshIntervalSelect value={null} onChange={() => {}} />);
    const labels = Array.from(
      screen.getByRole("combobox").querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(labels).toEqual(["Off", "5s", "30s", "1m", "5m", "15m"]);
  });

  it("shows the current value as selected ('Off' when null)", () => {
    render(<RefreshIntervalSelect value={null} onChange={() => {}} />);
    expect(
      (screen.getByRole("combobox") as HTMLSelectElement).value,
    ).toBe("off");
  });

  it("shows the current value as selected (30s when value=30000)", () => {
    render(<RefreshIntervalSelect value={30_000} onChange={() => {}} />);
    expect(
      (screen.getByRole("combobox") as HTMLSelectElement).value,
    ).toBe("30000");
  });

  it("emits a number when a numeric option is picked", () => {
    const onChange = vi.fn();
    render(<RefreshIntervalSelect value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "5000" },
    });
    expect(onChange).toHaveBeenCalledWith(5_000);
  });

  it("emits null when 'Off' is picked", () => {
    const onChange = vi.fn();
    render(<RefreshIntervalSelect value={5_000} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "off" },
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("has an accessible label", () => {
    render(<RefreshIntervalSelect value={null} onChange={() => {}} />);
    expect(screen.getByLabelText(/refresh/i)).toBeTruthy();
  });
});
