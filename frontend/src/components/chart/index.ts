import { lazyChart } from "./lazy-chart";

export * from "./chart-legend";
export * from "./chart-theme";
export * from "./chart-tooltip";

export const IncomeExpenseChart = lazyChart(
  async () => (await import("./income-expense-chart")).IncomeExpenseChart,
  280,
);
