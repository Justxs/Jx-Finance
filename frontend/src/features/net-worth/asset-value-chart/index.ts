import { lazyChart } from "@/components/chart/lazy-chart";

export const AssetValueChart = lazyChart(
  async () => (await import("./asset-value-chart")).AssetValueChart,
  { legend: true },
);
