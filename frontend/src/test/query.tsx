import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { vi } from "vitest";
import { getGetCurrenciesEndpointQueryKey, getGetSettingsEndpointQueryKey } from "@/api/generated";
import type { CurrenciesResponse, SettingsResponse } from "@/api/generated/model";

interface Seed {
  settings?: SettingsResponse;
  currencies?: CurrenciesResponse;
}

export function createQueryWrapper({ settings, currencies }: Seed = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => {})),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (settings) {
    client.setQueryData(getGetSettingsEndpointQueryKey(), settings);
  }
  if (currencies) {
    client.setQueryData(getGetCurrenciesEndpointQueryKey(), currencies);
  }

  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, Wrapper };
}

export function plain(text: string) {
  return text.replaceAll(/\s/gu, " ");
}
