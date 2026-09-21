import { createFileRoute } from "@tanstack/react-router";
import { warmDashboard } from "@/features/dashboard/dashboard-layout";
import { DashboardPage } from "@/features/dashboard/dashboard-page/dashboard-page";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => {
    warmDashboard(queryClient);
  },
  component: DashboardPage,
});
