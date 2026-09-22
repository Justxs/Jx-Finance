import { lazyChart } from "@/components/chart/lazy-chart";

export const DebtBalanceChart = lazyChart(
  async () => (await import("./debt-balance-chart")).DebtBalanceChart,
  240,
);
