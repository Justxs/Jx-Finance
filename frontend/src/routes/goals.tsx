import { createFileRoute } from "@tanstack/react-router";
import { GoalsPage } from "@/features/goals/goals-page";
import { requireFeature } from "@/lib/feature-gate";

export const Route = createFileRoute("/goals")({
  beforeLoad: requireFeature("goals"),
  component: GoalsPage,
});
