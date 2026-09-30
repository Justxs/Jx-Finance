import { lazyChart } from "@/components/chart/lazy-chart";
import { PLACE_MAP_HEIGHT } from "./place-features";

export const PlaceMap = lazyChart(async () => (await import("./place-map")).PlaceMap, {
  height: PLACE_MAP_HEIGHT,
});
