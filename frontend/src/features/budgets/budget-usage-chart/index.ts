import { lazyChart } from "@/components/chart/lazy-chart";

export const BudgetUsageChart = lazyChart(
  async () => (await import("./budget-usage-chart")).BudgetUsageChart,
  208,
);
