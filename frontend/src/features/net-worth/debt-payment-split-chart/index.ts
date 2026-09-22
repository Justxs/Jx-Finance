import { lazyChart } from "@/components/chart/lazy-chart";

export const DebtPaymentSplitChart = lazyChart(
  async () => (await import("./debt-payment-split-chart")).DebtPaymentSplitChart,
  240,
);
