import { createFileRoute } from "@tanstack/react-router";
import { RecurringBillsPage } from "@/features/recurring-bills/recurring-bills-page";

export const Route = createFileRoute("/recurring-bills")({
  component: RecurringBillsPage,
});
