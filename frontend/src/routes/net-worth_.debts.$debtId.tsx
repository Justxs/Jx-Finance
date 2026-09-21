import { createFileRoute } from "@tanstack/react-router";
import { getDebtScheduleSuspenseQueryOptions, getDebtsSuspenseQueryOptions } from "@/api/generated";
import { DebtSchedulePage } from "@/features/net-worth/debt-schedule-page/debt-schedule-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/net-worth_/debts/$debtId")({
  beforeLoad: requireFeature("netWorth"),
  loader: ({ context: { queryClient }, params }) => {
    warm(queryClient, getDebtsSuspenseQueryOptions());
    warm(queryClient, getDebtScheduleSuspenseQueryOptions(params.debtId));
  },
  component: DebtScheduleRoute,
});

function DebtScheduleRoute() {
  const { debtId } = Route.useParams();

  return <DebtSchedulePage debtId={debtId} />;
}
