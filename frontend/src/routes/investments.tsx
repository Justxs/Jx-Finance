import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getGetAccountsQueryOptions } from "@/api/generated";
import { InvestmentsPage } from "@/features/investments/investments-page";
import { requireFeature } from "@/lib/feature-gate";
import { queryClient } from "@/lib/query-client";

export const investmentsSearchSchema = z.object({
  accountId: z.uuid().optional().catch(undefined),
});

const requireInvestments = requireFeature("investments");

async function isKnownAccount(accountId: string): Promise<boolean> {
  try {
    const accounts = await queryClient.ensureQueryData(getGetAccountsQueryOptions());
    return accounts.some((account) => account.id === accountId);
  } catch {
    return true;
  }
}

export const Route = createFileRoute("/investments")({
  validateSearch: investmentsSearchSchema,
  beforeLoad: async ({ search }) => {
    await requireInvestments();
    if (search.accountId && !(await isKnownAccount(search.accountId))) {
      throw redirect({ to: "/investments", search: {}, replace: true });
    }
  },
  component: InvestmentsPage,
});
