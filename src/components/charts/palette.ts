// Line colours and dash styles shared by the basket chart, its legends and the holdings table's
// line swatches. Kept out of any component so a swatch and its chart line can't drift apart.
import { LineStyle } from "lightweight-charts";

// Categorical slots 1-7 of the dataviz reference palette, stepped per theme and validated
// against this site's panel colours. Benchmarks are drawn in ink instead, so they never
// compete with a stock for a hue. Hex on purpose: the chart library draws on a canvas, which
// can't read Tailwind tokens or CSS variables.
export const SLOTS = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9"],
};

export type Dash = "solid" | "long" | "dash" | "dot";

/** A dash on the canvas chart. */
export const STYLE: Record<Dash, LineStyle> = {
  solid: LineStyle.Solid,
  long: LineStyle.LargeDashed,
  dash: LineStyle.Dashed,
  dot: LineStyle.SparseDotted,
};

/** The same dash as an SVG stroke-dasharray, for legend and table swatches. */
export const DASHARRAY: Record<Dash, string | undefined> = {
  solid: undefined,
  long: "7 4",
  dash: "4 3",
  dot: "1 4",
};
