import { lazyChart } from "@/components/chart/lazy-chart";

export const SpendingPaceChart = lazyChart(
  async () => (await import("./spending-pace-chart")).SpendingPaceChart,
  240,
);
