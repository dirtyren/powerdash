import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetricPicker } from "@/components/widgets/MetricPicker";

const METRICS = [
  "up",
  "http_requests_total",
  "http_request_duration_seconds",
  "node_cpu_seconds_total",
];

describe("MetricPicker", () => {
  it("renders initial value", () => {
    render(
      <MetricPicker value="up" onChange={() => {}} metrics={METRICS} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("up");
  });

  it("typing filters the listbox", () => {
    render(
      <MetricPicker value="" onChange={() => {}} metrics={METRICS} />,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "http" } });
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "http_requests_total",
      "http_request_duration_seconds",
    ]);
  });

  it("clicking an option commits and closes", () => {
    const onChange = vi.fn();
    render(
      <MetricPicker value="" onChange={onChange} metrics={METRICS} />,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.mouseDown(screen.getByRole("option", { name: "up" }));
    expect(onChange).toHaveBeenCalledWith("up");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("arrow keys + Enter navigate and commit", () => {
    const onChange = vi.fn();
    render(
      <MetricPicker value="" onChange={onChange} metrics={METRICS} />,
    );
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("up");
  });

  it("external value prop updates the input", () => {
    const { rerender } = render(
      <MetricPicker value="up" onChange={() => {}} metrics={METRICS} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("up");
    rerender(
      <MetricPicker value="http_requests_total" onChange={() => {}} metrics={METRICS} />,
    );
    expect(screen.getByRole("combobox")).toHaveValue("http_requests_total");
  });

  it("click outside closes the dropdown", () => {
    render(
      <div>
        <MetricPicker value="" onChange={() => {}} metrics={METRICS} />
        <button>outside</button>
      </div>,
    );
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
    fireEvent.mouseDown(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
