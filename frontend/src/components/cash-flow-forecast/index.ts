import { lazyChart } from "@/components/chart/lazy-chart";

export const ForecastChart = lazyChart(
  async () => (await import("./forecast-chart")).ForecastChart,
  ({ account }) => ({ legend: account.usualDailySpending !== null }),
);
