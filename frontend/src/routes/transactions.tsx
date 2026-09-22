import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getTransactionsSummarySuspenseQueryOptions,
  getTransactionsSuspenseQueryOptions,
} from "@/api/generated";
import { FlowType, SortDirection, TransactionSortField } from "@/api/generated/model";
import {
  transactionFilterParams,
  transactionListParams,
  transactionView,
} from "@/features/transactions/transaction-queries";
import { TransactionsPage } from "@/features/transactions/transactions-page/transactions-page";
import { warm, warmWithSettings } from "@/lib/route-prefetch";

export const transactionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).catch(1),
  search: z.string().optional().catch(undefined),
  accountId: z.uuid().optional().catch(undefined),
  categoryId: z.uuid().optional().catch(undefined),
  tagIds: z
    .string()
    .refine((value) => value.split(",").every((id) => z.uuid().safeParse(id).success))
    .optional()
    .catch(undefined),
  type: z.enum(FlowType).optional().catch(undefined),
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
  sort: z.enum(TransactionSortField).optional().catch(undefined),
  direction: z.enum(SortDirection).optional().catch(undefined),
  new: z.boolean().optional().catch(undefined),
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
