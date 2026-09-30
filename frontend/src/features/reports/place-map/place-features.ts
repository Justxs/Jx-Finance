import type { PlaceBreakdownItem } from "@/api/generated/model";

export const PLACE_MAP_HEIGHT = 360;
export const MIN_DOT_RADIUS = 5;
export const MAX_DOT_RADIUS = 22;
const LABELLED_PLACES = 3;

export interface PlaceFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { place: string; amount: number; radius: number };
}

export interface PlaceFeatureCollection {
  type: "FeatureCollection";
  features: PlaceFeature[];
}

interface LocatedPlace {
  place: string;
  amount: number;
  latitude: number;
  longitude: number;
}

function locatedPlaces(items: readonly PlaceBreakdownItem[]): LocatedPlace[] {
  return items.flatMap((item) => {
    const amount = Number(item.amount);
    return item.place !== null && item.latitude !== null && item.longitude !== null && amount > 0
      ? [{ place: item.place, amount, latitude: item.latitude, longitude: item.longitude }]
      : [];
  });
}

export function dotRadius(amount: number, largest: number): number {
  if (largest <= 0) {
    return MIN_DOT_RADIUS;
  }
  return MIN_DOT_RADIUS + (MAX_DOT_RADIUS - MIN_DOT_RADIUS) * Math.sqrt(amount / largest);
}

export function placeFeatures(items: readonly PlaceBreakdownItem[]): PlaceFeatureCollection {
  const located = locatedPlaces(items).toSorted((a, b) => b.amount - a.amount);
  const largest = located[0]?.amount ?? 0;

  return {
    type: "FeatureCollection",
    features: located.map((item) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
      properties: {
        place: item.place,
        amount: item.amount,
        radius: dotRadius(item.amount, largest),
      },
    })),
  };
}

export function topPlaceNames(collection: PlaceFeatureCollection): string[] {
  return collection.features.slice(0, LABELLED_PLACES).map((feature) => feature.properties.place);
}
