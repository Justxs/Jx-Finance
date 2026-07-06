import { createFileRoute } from "@tanstack/react-router";
import { HouseholdsPage } from "@/features/households/households-page";

export const Route = createFileRoute("/households")({
  component: HouseholdsPage,
});
