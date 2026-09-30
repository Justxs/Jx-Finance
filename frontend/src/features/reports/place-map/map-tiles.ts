import { useQuery } from "@tanstack/react-query";
import { silentQuery } from "@/lib/query-client";

export const MAP_TILES_PATH = "/maps/lithuania.pmtiles";

async function tilesPresent(signal: AbortSignal): Promise<boolean> {
  const response = await fetch(MAP_TILES_PATH, { method: "HEAD", signal });
  const type = response.headers.get("content-type") ?? "";
  return response.ok && !type.startsWith("text/html");
}

export function useMapTilesPresent(): boolean {
  const present = useQuery({
    queryKey: [MAP_TILES_PATH, "head"],
    queryFn: ({ signal }) => tilesPresent(signal),
    staleTime: Number.POSITIVE_INFINITY,
    ...silentQuery,
  });
  return present.data === true;
}
