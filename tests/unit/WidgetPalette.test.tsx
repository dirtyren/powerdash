import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WidgetPalette } from "@/components/WidgetPalette";
import type { WidgetCatalogEntry } from "@/config/widget-catalog";

const catalog: WidgetCatalogEntry[] = [
  { id: "a", kind: "kpi", title: "Alpha", defaultW: 100, defaultH: 100 },
  { id: "b", kind: "line", title: "Bravo", defaultW: 200, defaultH: 100 },
];

describe("WidgetPalette", () => {
  it("renders a button for each catalog entry", () => {
    render(<WidgetPalette catalog={catalog} existingWidgetIds={new Set()} onAdd={() => {}} />);
    expect(screen.getByRole("button", { name: /Alpha/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Bravo/ })).toBeTruthy();
  });

  it("disables entries already present on the canvas", () => {
    render(
      <WidgetPalette
        catalog={catalog}
        existingWidgetIds={new Set(["a"])}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Alpha/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Bravo/ })).toBeEnabled();
  });

  it("fires onAdd with the clicked entry", () => {
    const onAdd = vi.fn();
    render(<WidgetPalette catalog={catalog} existingWidgetIds={new Set()} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: /Bravo/ }));
    expect(onAdd).toHaveBeenCalledWith(catalog[1]);
  });

  it("shows the kind as a badge-style label", () => {
    render(<WidgetPalette catalog={catalog} existingWidgetIds={new Set()} onAdd={() => {}} />);
    // both kind labels visible somewhere in the palette
    expect(screen.getByText("kpi")).toBeTruthy();
    expect(screen.getByText("line")).toBeTruthy();
  });
});
