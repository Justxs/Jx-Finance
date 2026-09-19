import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getInvestmentTransactionsSuspenseQueryOptions,
  getPortfolioSuspenseQueryOptions,
} from "@/api/generated";
import { activityParams, portfolioParams } from "@/features/investments/investment-queries";
import { InvestmentsPage } from "@/features/investments/investments-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const investmentsSearchSchema = z.object({
  accountId: z.uuid().optional().catch(undefined),
});

const requireInvestments = requireFeature("investments");

async function isKnownAccount(queryClient: QueryClient, accountId: string): Promise<boolean> {
  try {
    const accounts = await queryClient.ensureQueryData(getAccountsSuspenseQueryOptions());
    return accounts.some((account) => account.id === accountId);
  } catch {
    return true;
  }
}

export const Route = createFileRoute("/investments")({
  validateSearch: investmentsSearchSchema,
  beforeLoad: async ({ search, context }) => {
    await requireInvestments({ context });
    if (search.accountId && !(await isKnownAccount(context.queryClient, search.accountId))) {
      throw redirect({ to: "/investments", search: {}, replace: true });
    }
  },
  loaderDeps: ({ search }) => ({ accountId: search.accountId }),
  loader: ({ context: { queryClient }, deps }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getPortfolioSuspenseQueryOptions(portfolioParams(deps.accountId)));
    warm(
      queryClient,
      getInvestmentTransactionsSuspenseQueryOptions(activityParams(1, deps.accountId, "")),
    );
  },
  component: InvestmentsPage,
});
