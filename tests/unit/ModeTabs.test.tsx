import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModeTabs } from "@/components/widgets/ModeTabs";

describe("ModeTabs", () => {
  it("renders two tabs with role=tab", () => {
    render(<ModeTabs mode="code" onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent("Code");
    expect(tabs[1]).toHaveTextContent("Builder");
  });

  it("marks the active tab with aria-selected=true", () => {
    render(<ModeTabs mode="builder" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Builder" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("clicking the inactive tab fires onChange with its mode", () => {
    const onChange = vi.fn();
    render(<ModeTabs mode="code" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Builder" }));
    expect(onChange).toHaveBeenCalledWith("builder");
  });

  it("renders Builder tab disabled with tooltip when builderDisabled is set", () => {
    render(
      <ModeTabs
        mode="code"
        onChange={() => {}}
        builderDisabled={{ reason: "nope" }}
      />,
    );
    const builder = screen.getByRole("tab", { name: "Builder" });
    expect(builder).toBeDisabled();
    expect(builder).toHaveAttribute("title", "nope");
  });

  it("disabled Builder tab does not fire onChange when clicked", () => {
    const onChange = vi.fn();
    render(
      <ModeTabs
        mode="code"
        onChange={onChange}
        builderDisabled={{ reason: "x" }}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "Builder" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
