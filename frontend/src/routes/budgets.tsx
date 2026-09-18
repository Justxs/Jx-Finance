import { createFileRoute } from "@tanstack/react-router";
import { BudgetsPage } from "@/features/budgets/budgets-page";
import { requireFeature } from "@/lib/feature-gate";

export const Route = createFileRoute("/budgets")({
  beforeLoad: requireFeature("budgets"),
  component: BudgetsPage,
});
