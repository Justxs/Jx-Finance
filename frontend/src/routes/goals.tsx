import { createFileRoute } from "@tanstack/react-router";
import { GoalsPage } from "@/features/goals/goals-page";

export const Route = createFileRoute("/goals")({
  component: GoalsPage,
});
