import { lazyChart } from "@/components/chart/lazy-chart";

export const NetWorthHistoryChart = lazyChart(
  async () => (await import("./net-worth-history-chart")).NetWorthHistoryChart,
  240,
);
