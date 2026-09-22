import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { vi } from "vitest";
import { getCurrenciesQueryKey, getSettingsQueryKey } from "@/api/generated";
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
    client.setQueryData(getSettingsQueryKey(), settings);
  }
  if (currencies) {
    client.setQueryData(getCurrenciesQueryKey(), currencies);
  }

  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, Wrapper };
}

export function renderWithQuery(ui: ReactElement, seed?: Seed) {
  const { client, Wrapper } = createQueryWrapper(seed);
  return { client, ...render(ui, { wrapper: Wrapper }) };
}

export function plain(text: string) {
  return text.replaceAll(/\s/gu, " ");
}
