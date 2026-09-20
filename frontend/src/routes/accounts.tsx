import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getConversionsSuspenseQueryOptions,
  getHouseholdsSuspenseQueryOptions,
  getTransfersSuspenseQueryOptions,
} from "@/api/generated";
import {
  accountListParams,
  conversionsPageParams,
  transfersPageParams,
} from "@/features/accounts/account-queries";
import { accountTypes } from "@/features/accounts/account-types";
import { AccountsPage } from "@/features/accounts/accounts-page/accounts-page";
import { warm, warmWithSettings } from "@/lib/route-prefetch";

export const accountsSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  iban: z.string().optional().catch(undefined),
  type: z.enum(accountTypes).optional().catch(undefined),
  sort: z
    .enum(["created", "name", "iban", "type", "startingBalance", "currentBalance"])
    .optional()
    .catch(undefined),
  direction: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/accounts")({
  validateSearch: accountsSearchSchema,
  loaderDeps: ({ search }) => accountListParams(search),
  loader: ({ context: { queryClient }, deps }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions(deps));
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getHouseholdsSuspenseQueryOptions());
    warm(queryClient, getTransfersSuspenseQueryOptions(transfersPageParams(1)));
    warmWithSettings(queryClient, (settings) => {
      if (settings.features.multiCurrency) {
        warm(queryClient, getConversionsSuspenseQueryOptions(conversionsPageParams(1)));
        warm(queryClient, getCategoriesSuspenseQueryOptions());
      }
    });
  },
  component: AccountsPage,
});
