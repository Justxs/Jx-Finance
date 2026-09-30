import "maplibre-gl/dist/maplibre-gl.css";
import {
  addProtocol,
  type LngLatBoundsLike,
  Map as MapLibreMap,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PlaceBreakdownItem } from "@/api/generated/model";
import latinExtFont from "@/assets/fonts/source-sans-3-latin-ext-wght-normal.woff2?url";
import latinFont from "@/assets/fonts/source-sans-3-latin-wght-normal.woff2?url";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { MAP_TILES_PATH } from "./map-tiles";
import { type PlaceFeatureCollection, placeFeatures, topPlaceNames } from "./place-features";

const LITHUANIA: LngLatBoundsLike = [
  [20.93, 53.89],
  [26.84, 56.45],
];
const AROUND_LITHUANIA: LngLatBoundsLike = [
  [19.5, 53.2],
  [28.3, 57.2],
];
const FONT = "Source Sans 3";
const PLACES_LAYER = "places";

setWorkerUrl(workerUrl);
addProtocol("pmtiles", new Protocol().tile);

interface Props {
  items: PlaceBreakdownItem[];
  onSelect: (place: string) => void;
}

interface MapColors {
  land: string;
  water: string;
  road: string;
  boundary: string;
  label: string;
  dot: string;
}

function token(style: CSSStyleDeclaration, name: string) {
  return style.getPropertyValue(name).trim();
}

function themeColors(): MapColors {
  const style = getComputedStyle(document.documentElement);
  return {
    land: token(style, "--background"),
    water: token(style, "--accent"),
    road: token(style, "--border"),
    boundary: token(style, "--input"),
    label: token(style, "--muted-foreground"),
    dot: token(style, "--primary"),
  };
}

function mapStyle(colors: MapColors, places: PlaceFeatureCollection): StyleSpecification {
  return {
    version: 8,
    "font-faces": {
      [FONT]: [
        { url: latinFont, "unicode-range": ["U+0000-00FF", "U+2000-206F", "U+20AC"] },
        { url: latinExtFont, "unicode-range": ["U+0100-02BA", "U+1E00-1E9F"] },
      ],
    },
    sources: {
      basemap: {
        type: "vector",
        url: `pmtiles://${new URL(MAP_TILES_PATH, globalThis.location.href).href}`,
        attribution: "© OpenStreetMap",
      },
      [PLACES_LAYER]: { type: "geojson", data: places },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": colors.water } },
      {
        id: "earth",
        type: "fill",
        source: "basemap",
        "source-layer": "earth",
        paint: { "fill-color": colors.land },
      },
      {
        id: "water",
        type: "fill",
        source: "basemap",
        "source-layer": "water",
        paint: { "fill-color": colors.water },
      },
      {
        id: "roads",
        type: "line",
        source: "basemap",
        "source-layer": "roads",
        filter: ["in", ["get", "kind"], ["literal", ["highway", "major_road"]]],
        paint: { "line-color": colors.road, "line-width": 1 },
      },
      {
        id: "boundaries",
        type: "line",
        source: "basemap",
        "source-layer": "boundaries",
        filter: ["==", ["get", "kind"], "country"],
        paint: { "line-color": colors.boundary, "line-width": 1, "line-dasharray": [3, 2] },
      },
      {
        id: "cities",
        type: "symbol",
        source: "basemap",
        "source-layer": "places",
        filter: ["==", ["get", "kind"], "locality"],
        layout: { "text-field": ["get", "name"], "text-font": [FONT], "text-size": 12 },
        paint: { "text-color": colors.label, "text-halo-color": colors.land, "text-halo-width": 1 },
      },
      {
        id: PLACES_LAYER,
        type: "circle",
        source: PLACES_LAYER,
        layout: { "circle-sort-key": ["-", 0, ["get", "amount"]] },
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": colors.dot,
          "circle-opacity": 0.45,
          "circle-stroke-color": colors.dot,
          "circle-stroke-width": 1,
        },
      },
    ],
  };
}

export function PlaceMap({ items, onSelect }: Readonly<Props>) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const places = placeFeatures(items);
  const names = topPlaceNames(places);
  const label =
    names.length > 0
      ? t("reports.expenseByPlace.mapLabel", { places: names.join(", ") })
      : t("reports.expenseByPlace.mapLabelEmpty");

  function draw(container: HTMLDivElement | null) {
    if (!container) {
      return undefined;
    }
    try {
      const map = new MapLibreMap({
        container,
        style: mapStyle(themeColors(), places),
        bounds: LITHUANIA,
        maxBounds: AROUND_LITHUANIA,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.on("click", PLACES_LAYER, (event) => {
        const place = event.features?.[0]?.properties.place;
        if (typeof place === "string") {
          onSelect(place);
        }
      });
      map.on("mouseenter", PLACES_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", PLACES_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
      return () => map.remove();
    } catch {
      setFailed(true);
      return undefined;
    }
  }

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={label}
        ref={failed ? undefined : draw}
        className="h-90 w-full overflow-hidden rounded-lg bg-muted/50"
      />
      {failed ? <EmptyText size="sm">{t("reports.expenseByPlace.mapFailed")}</EmptyText> : null}
      {places.features.length === 0 ? (
        <EmptyText size="sm">{t("reports.expenseByPlace.noCoordinates")}</EmptyText>
      ) : null}
    </div>
  );
}
