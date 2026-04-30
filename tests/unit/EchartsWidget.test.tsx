import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { EchartsWidget } from "@/components/widgets/EchartsWidget";

describe("EchartsWidget", () => {
  it("renders a container div given a minimal option", () => {
    const { container } = render(
      <EchartsWidget
        option={{
          xAxis: { type: "category", data: ["A"] },
          yAxis: { type: "value" },
          series: [{ type: "line", data: [1] }],
        }}
      />,
    );
    // echarts-for-react lazy-loads; in happy-dom the chart itself may not
    // actually paint, but the host div must exist.
    expect(container.querySelector("div")).not.toBeNull();
  });
});
