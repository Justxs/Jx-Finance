import { createFileRoute } from "@tanstack/react-router";
import { NetWorthPage } from "@/features/net-worth/net-worth-page";

export const Route = createFileRoute("/net-worth")({
  component: NetWorthPage,
});
