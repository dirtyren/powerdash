import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WidgetPalette } from "@/components/WidgetPalette";

describe("WidgetPalette (P2.3)", () => {
  it("renders a button for every adapter", () => {
    render(<WidgetPalette onAdd={() => {}} />);
    // 20 kinds → at least one button per kind (display name appears once)
    expect(screen.getByRole("button", { name: "KPI" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bar chart" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pie chart" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Table" })).toBeTruthy();
  });

  it("groups buttons under family headings in fixed order", () => {
    render(<WidgetPalette onAdd={() => {}} />);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "Stats",
      "Series",
      "Comparison",
      "Part of whole",
      "Hierarchies",
      "Density",
      "Distribution",
      "Financial",
      "Data",
    ]);
  });

  it("fires onAdd with the clicked adapter", () => {
    const onAdd = vi.fn();
    render(<WidgetPalette onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Bar chart" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]![0].kind).toBe("bar");
  });

  it("buttons are never disabled (no duplicate guard)", () => {
    const onAdd = vi.fn();
    render(<WidgetPalette onAdd={onAdd} />);
    const bar = screen.getByRole("button", { name: "Bar chart" });
    fireEvent.click(bar);
    fireEvent.click(bar);
    expect(onAdd).toHaveBeenCalledTimes(2);
  });
});
