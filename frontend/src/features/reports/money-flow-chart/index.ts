import { lazyChart } from "@/components/chart/lazy-chart";
import { MONEY_FLOW_HEIGHT } from "@/features/reports/money-flow/money-flow-graph";

export const MoneyFlowChart = lazyChart(
  async () => (await import("./money-flow-chart")).MoneyFlowChart,
  { height: MONEY_FLOW_HEIGHT },
);
