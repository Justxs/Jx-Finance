import { createFileRoute } from "@tanstack/react-router";
import { NetWorthPage } from "@/features/net-worth/net-worth-page";
import { requireFeature } from "@/lib/feature-gate";

export const Route = createFileRoute("/net-worth")({
  beforeLoad: requireFeature("netWorth"),
  component: NetWorthPage,
});
