import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getArchivedAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getConversionsSuspenseQueryOptions,
  getHouseholdsSuspenseQueryOptions,
  getTransfersSuspenseQueryOptions,
} from "@/api/generated";
import { AccountSortField } from "@/api/generated/model";
import {
  accountListParams,
  conversionsPageParams,
  transfersPageParams,
} from "@/features/accounts/account-queries";
import { accountTypes } from "@/features/accounts/account-types";
import { AccountsPage } from "@/features/accounts/accounts-page/accounts-page";
import { warm, warmWithSettings } from "@/lib/route-prefetch";
import { optionalParam, sortParams } from "@/lib/search-schema";

export const accountsSearchSchema = z.object({
  search: optionalParam(z.string()),
  iban: optionalParam(z.string()),
  type: optionalParam(z.enum(accountTypes)),
  ...sortParams(AccountSortField),
  new: optionalParam(z.enum(["account", "transfer"])),
});

export const Route = createFileRoute("/accounts")({
  validateSearch: accountsSearchSchema,
  loaderDeps: ({ search }) => accountListParams(search),
  loader: ({ context: { queryClient }, deps }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions(deps));
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getArchivedAccountsSuspenseQueryOptions());
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
