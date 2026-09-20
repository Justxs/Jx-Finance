import { lazyChart } from "@/components/chart/lazy-chart";

export const BillsForecastChart = lazyChart(
  async () => (await import("./bills-forecast-chart")).BillsForecastChart,
  220,
);
