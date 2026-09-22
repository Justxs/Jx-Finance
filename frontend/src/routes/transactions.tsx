import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getTransactionsSummarySuspenseQueryOptions,
  getTransactionsSuspenseQueryOptions,
} from "@/api/generated";
import { FlowType, TransactionSortField } from "@/api/generated/model";
import {
  transactionFilterParams,
  transactionListParams,
  transactionView,
} from "@/features/transactions/transaction-queries";
import { TransactionsPage } from "@/features/transactions/transactions-page/transactions-page";
import { warm, warmWithSettings } from "@/lib/route-prefetch";
import { optionalParam, sortParams } from "@/lib/search-schema";

export const transactionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).catch(1),
  search: optionalParam(z.string()),
  accountId: optionalParam(z.uuid()),
  categoryId: optionalParam(z.uuid()),
  tagIds: optionalParam(
    z.string().refine((value) => value.split(",").every((id) => z.uuid().safeParse(id).success)),
  ),
  type: optionalParam(z.enum(FlowType)),
  dateFrom: optionalParam(z.string()),
  dateTo: optionalParam(z.string()),
  ...sortParams(TransactionSortField),
  new: optionalParam(z.boolean()),
});

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
        getTransactionsSuspenseQueryOptions(transactionListParams(deps, settings.defaultPageSize)),
      );
    });
  },
  component: TransactionsPage,
});
