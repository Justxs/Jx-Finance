import { describe, expect, test } from "vitest";
import type { PlaceBreakdownItem } from "@/api/generated/model";
import {
  MAX_DOT_RADIUS,
  MIN_DOT_RADIUS,
  dotRadius,
  placeFeatures,
  topPlaceNames,
} from "./place-features";

function item(
  place: string | null,
  amount: string,
  latitude: number | null,
  longitude: number | null,
): PlaceBreakdownItem {
  return { place, amount, comparisonAmount: null, count: 1, latitude, longitude };
}

describe("placeFeatures", () => {
  test("turns every located place with spending into a point, largest first, as longitude and latitude", () => {
    const collection = placeFeatures([
      item("Lidl", "20.00", 54.71293, 25.30118),
      item("Maxima", "80.00", 54.72381, 25.23612),
    ]);

    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features.map((feature) => feature.geometry.coordinates)).toEqual([
      [25.23612, 54.72381],
      [25.30118, 54.71293],
    ]);
    expect(collection.features.map((feature) => feature.properties.place)).toEqual([
      "Maxima",
      "Lidl",
    ]);
    expect(collection.features[0]?.properties.amount).toBe(80);
  });

  test("leaves out places without coordinates, the no-place group and places that only the earlier period had", () => {
    const collection = placeFeatures([
      item("Caffeine", "9.00", null, null),
      item(null, "300.00", null, null),
      { ...item("Gym", "0.00", 54.7, 25.3), comparisonAmount: "39.00" },
      item("Rimi", "12.00", 54.71612, 25.27794),
    ]);

    expect(collection.features.map((feature) => feature.properties.place)).toEqual(["Rimi"]);
  });

  test("an empty list gives an empty collection", () => {
    expect(placeFeatures([]).features).toEqual([]);
  });

  test("the dot area grows with the amount, from the smallest radius to the largest", () => {
    const [largest, quarter] = placeFeatures([
      item("Maxima", "100.00", 54.7, 25.2),
      item("Kiosk", "25.00", 54.8, 25.3),
    ]).features;

    expect(largest?.properties.radius).toBe(MAX_DOT_RADIUS);
    expect(quarter?.properties.radius).toBe(
      MIN_DOT_RADIUS + (MAX_DOT_RADIUS - MIN_DOT_RADIUS) * 0.5,
    );
    expect(dotRadius(10, 0)).toBe(MIN_DOT_RADIUS);
  });
});

describe("topPlaceNames", () => {
  test("names the three places with the most spending for the map's label", () => {
    const collection = placeFeatures([
      item("A", "1.00", 54.1, 25.1),
      item("B", "4.00", 54.2, 25.2),
      item("C", "3.00", 54.3, 25.3),
      item("D", "2.00", 54.4, 25.4),
    ]);

    expect(topPlaceNames(collection)).toEqual(["B", "C", "D"]);
  });
});
