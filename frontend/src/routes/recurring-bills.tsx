import { createFileRoute } from "@tanstack/react-router";
import { RecurringBillsPage } from "@/features/recurring-bills/recurring-bills-page";
import { requireFeature } from "@/lib/feature-gate";

export const Route = createFileRoute("/recurring-bills")({
  beforeLoad: requireFeature("recurringBills"),
  component: RecurringBillsPage,
});
