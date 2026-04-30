import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";

describe("WidgetFrame", () => {
  it("renders the title as static text when onTitleChange is not provided", () => {
    render(
      <WidgetFrame title="CPU %">
        <div>content</div>
      </WidgetFrame>,
    );
    expect(screen.getByText("CPU %")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("renders the title as an input bound to onTitleChange when provided", () => {
    const onTitleChange = vi.fn();
    render(
      <WidgetFrame title="Bar chart" onTitleChange={onTitleChange}>
        <div>content</div>
      </WidgetFrame>,
    );
    const input = screen.getByRole("textbox", { name: "Widget title" });
    expect(input).toHaveValue("Bar chart");
    fireEvent.change(input, { target: { value: "Renamed" } });
    expect(onTitleChange).toHaveBeenCalledWith("Renamed");
  });
});
