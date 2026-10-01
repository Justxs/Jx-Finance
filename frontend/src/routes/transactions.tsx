import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getLedgerSuspenseQueryOptions,
  getTransactionsSummarySuspenseQueryOptions,
} from "@/api/generated";
import {
  transactionFilterParams,
  transactionListParams,
  transactionsSearchSchema,
  transactionView,
} from "@/features/transactions/transaction-queries";
import { TransactionsPage } from "@/features/transactions/transactions-page/transactions-page";
import { TransactionsPending } from "@/features/transactions/transactions-page/transactions-page-pending";
import { warm, warmWithSettings } from "@/lib/route-prefetch";
import { readPreferences } from "@/stores/preferences";

export const Route = createFileRoute("/transactions")({
  validateSearch: transactionsSearchSchema,
  loaderDeps: ({ search }) => transactionView(search),
  loader: ({ context: { queryClient }, deps }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getTransactionsSummarySuspenseQueryOptions(transactionFilterParams(deps)));
    warmWithSettings(queryClient, (settings) => {
      warm(
        queryClient,
        getLedgerSuspenseQueryOptions(
          transactionListParams(deps, readPreferences().pageSize ?? settings.defaultPageSize),
        ),
      );
    });
  },
  component: TransactionsPage,
  pendingComponent: TransactionsPending,
});
