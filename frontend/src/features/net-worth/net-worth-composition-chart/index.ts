import { lazyChart } from "@/components/chart/lazy-chart";

export const NetWorthCompositionChart = lazyChart(
  async () => (await import("./net-worth-composition-chart")).NetWorthCompositionChart,
  240,
);
