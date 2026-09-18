import { createFileRoute } from "@tanstack/react-router";
import { HouseholdsPage } from "@/features/households/households-page";
import { requireFeature } from "@/lib/feature-gate";

export const Route = createFileRoute("/households")({
  beforeLoad: requireFeature("households"),
  component: HouseholdsPage,
});
