import { useQuery } from "@tanstack/react-query";
import { customFetch } from "../client";

export type PingResponse = {
  message: string;
  utcNow: string;
};

export const getPing = () => {
  return customFetch<PingResponse>({
    url: "/api/ping",
    method: "GET",
  });
};

export const usePing = () => {
  return useQuery({
    queryKey: ["ping"],
    queryFn: getPing,
  });
};
