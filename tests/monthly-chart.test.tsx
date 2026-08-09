import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MonthlyChart } from "@/app/(dashboard)/dashboard/monthly-chart";

const data = [
  { month: "2026-06", count: 12 },
  { month: "2026-07", count: 30 },
  { month: "2026-08", count: 5 },
];

describe("MonthlyChart", () => {
  it("renders one bar per month", () => {
    render(<MonthlyChart data={data} />);
    const chart = screen.getByRole("img", { name: /applications per month/i });
    expect(chart.children).toHaveLength(3);
  });

  it("shows a tooltip with the value on hover", () => {
    render(<MonthlyChart data={data} />);
    const chart = screen.getByRole("img", { name: /applications per month/i });
    fireEvent.mouseEnter(chart.children[1]);
    expect(screen.getByText(/Jul 26: 30/)).toBeInTheDocument();
    fireEvent.mouseLeave(chart.children[1]);
    expect(screen.queryByText(/Jul 26: 30/)).not.toBeInTheDocument();
  });

  it("provides a table fallback with every value", () => {
    render(<MonthlyChart data={data} />);
    expect(screen.getByText("View as table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4); // header + 3 months
  });
});
