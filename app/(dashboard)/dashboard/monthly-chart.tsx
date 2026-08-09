"use client";

import { useState } from "react";
import styles from "./dashboard.module.scss";

const monthFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "2-digit",
});

/* Single-series bar chart: one hue, thin bars with rounded data-ends, 2px
 * gaps, per-bar hover tooltip. One series → no legend; the title names it. */
export function MonthlyChart({
  data,
}: {
  data: { month: string; count: number }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div>
      <div className={styles.chart} role="img" aria-label="Applications per month">
        {data.map((d, i) => (
          <div
            key={d.month}
            className={styles.barColumn}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            {active === i && (
              <span className={styles.tooltip}>
                {monthFmt.format(new Date(`${d.month}-01T00:00:00`))}:{" "}
                {d.count.toLocaleString()}
              </span>
            )}
            <span
              className={styles.bar}
              data-active={active === i}
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className={styles.chartAxis}>
        <span>{monthFmt.format(new Date(`${data[0].month}-01T00:00:00`))}</span>
        <span>
          {monthFmt.format(new Date(`${data[data.length - 1].month}-01T00:00:00`))}
        </span>
      </div>

      {/* Table view for screen readers and anyone who prefers numbers */}
      <details className={styles.tableToggle}>
        <summary>View as table</summary>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Applications</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td>{monthFmt.format(new Date(`${d.month}-01T00:00:00`))}</td>
                <td>{d.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
