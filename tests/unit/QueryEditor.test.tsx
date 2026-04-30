import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryEditor } from "@/components/widgets/QueryEditor";
import type { WidgetRef } from "@/server/schemas/widget";

const baseWidget: WidgetRef = {
  id: "abc",
  kind: "line",
  title: "Line chart",
  x: 0,
  y: 0,
  w: 480,
  h: 320,
};

describe("QueryEditor", () => {
  it("renders with empty fields when widget has no query", () => {
    render(
      <QueryEditor widget={baseWidget} onApply={() => {}} onBack={() => {}} />,
    );
    const textarea = screen.getByRole("textbox", { name: "PromQL expression" });
    expect(textarea).toHaveValue("");
    const stepInput = screen.getByRole("spinbutton", { name: "Step seconds" });
    expect(stepInput).toHaveValue(null);
  });

  it("renders with pre-filled fields when widget has a query", () => {
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up", step: 30 } };
    render(
      <QueryEditor widget={widget} onApply={() => {}} onBack={() => {}} />,
    );
    expect(screen.getByRole("textbox", { name: "PromQL expression" })).toHaveValue("up");
    expect(screen.getByRole("spinbutton", { name: "Step seconds" })).toHaveValue(30);
  });

  it("Apply is disabled when expr is empty", () => {
    render(
      <QueryEditor widget={baseWidget} onApply={() => {}} onBack={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("Apply is disabled when current values are unchanged", () => {
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up" } };
    render(
      <QueryEditor widget={widget} onApply={() => {}} onBack={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("clicking Apply fires onApply with the new expr", () => {
    const onApply = vi.fn();
    render(
      <QueryEditor widget={baseWidget} onApply={onApply} onBack={() => {}} />,
    );
    const textarea = screen.getByRole("textbox", { name: "PromQL expression" });
    fireEvent.change(textarea, { target: { value: "rate(foo[5m])" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({ expr: "rate(foo[5m])" });
  });

  it("clicking Apply with a step value includes step in the payload", () => {
    const onApply = vi.fn();
    render(
      <QueryEditor widget={baseWidget} onApply={onApply} onBack={() => {}} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "PromQL expression" }), {
      target: { value: "up" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Step seconds" }), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({ expr: "up", step: 30 });
  });

  it("clicking Clear fires onApply(undefined)", () => {
    const onApply = vi.fn();
    const widget: WidgetRef = { ...baseWidget, query: { expr: "up" } };
    render(
      <QueryEditor widget={widget} onApply={onApply} onBack={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear query" }));
    expect(onApply).toHaveBeenCalledWith(undefined);
  });

  it("clicking Back fires onBack", () => {
    const onBack = vi.fn();
    render(
      <QueryEditor widget={baseWidget} onApply={() => {}} onBack={onBack} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "← Widgets" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows validation error for a non-positive step", () => {
    render(
      <QueryEditor widget={baseWidget} onApply={() => {}} onBack={() => {}} />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "PromQL expression" }), {
      target: { value: "up" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Step seconds" }), {
      target: { value: "-5" },
    });
    expect(screen.getByText(/Step must be a positive number/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
});
