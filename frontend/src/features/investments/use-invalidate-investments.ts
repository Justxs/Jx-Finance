import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAccountsEndpointQueryKey,
  getGetBrokerConnectionsEndpointQueryKey,
  getGetConversionsEndpointQueryKey,
  getGetDashboardSummaryEndpointQueryKey,
  getGetInvestmentTransactionsEndpointQueryKey,
  getGetNetWorthEndpointQueryKey,
  getGetNetWorthHistoryEndpointQueryKey,
  getGetPortfolioEndpointQueryKey,
  getGetSecuritiesEndpointQueryKey,
  getGetTransactionsEndpointQueryKey,
  getGetTransfersEndpointQueryKey,
} from "@/api/generated";

export function useInvalidateInvestments() {
  const queryClient = useQueryClient();

  function invalidateAll(keys: readonly (readonly unknown[])[]) {
    for (const queryKey of keys) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }

  function invalidateEntries() {
    invalidateAll([
      getGetPortfolioEndpointQueryKey(),
      getGetInvestmentTransactionsEndpointQueryKey(),
      getGetSecuritiesEndpointQueryKey(),
      getGetAccountsEndpointQueryKey(),
      getGetDashboardSummaryEndpointQueryKey(),
      getGetNetWorthEndpointQueryKey(),
      getGetNetWorthHistoryEndpointQueryKey(),
    ]);
  }

  function invalidateConnections() {
    invalidateAll([getGetBrokerConnectionsEndpointQueryKey()]);
  }

  function invalidateImport() {
    invalidateEntries();
    invalidateAll([
      getGetBrokerConnectionsEndpointQueryKey(),
      getGetTransfersEndpointQueryKey(),
      getGetConversionsEndpointQueryKey(),
      getGetTransactionsEndpointQueryKey(),
    ]);
  }

  return { invalidateEntries, invalidateConnections, invalidateImport };
}
