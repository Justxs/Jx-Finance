import { lazyChart } from "@/components/chart/lazy-chart";

export const ValueChart = lazyChart(async () => (await import("./value-chart")).ValueChart, 240);
