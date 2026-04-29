import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditToolbar } from "@/components/EditToolbar";

describe("EditToolbar", () => {
  it("renders a read-only heading when onTitleChange is not provided (existing behaviour)", () => {
    render(
      <EditToolbar
        title="My Dashboard"
        isDirty={false}
        isSaving={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { name: "My Dashboard" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("renders an input bound to onTitleChange when provided", () => {
    const onTitleChange = vi.fn();
    render(
      <EditToolbar
        title="Draft"
        isDirty={true}
        isSaving={false}
        onSave={() => {}}
        onCancel={() => {}}
        onTitleChange={onTitleChange}
      />,
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Draft");
    fireEvent.change(input, { target: { value: "Renamed" } });
    expect(onTitleChange).toHaveBeenCalledWith("Renamed");
  });

  it("disables Save when not dirty", () => {
    render(
      <EditToolbar
        title="x"
        isDirty={false}
        isSaving={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /^Save/ })).toBeDisabled();
  });
});
