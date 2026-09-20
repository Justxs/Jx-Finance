import { createFileRoute } from "@tanstack/react-router";
import { getGoalsSuspenseQueryOptions } from "@/api/generated";
import { GoalsPage } from "@/features/goals/goals-page/goals-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/goals")({
  beforeLoad: requireFeature("goals"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getGoalsSuspenseQueryOptions());
  },
  component: GoalsPage,
});
