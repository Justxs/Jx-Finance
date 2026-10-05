import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { warmDashboard } from "@/features/dashboard/dashboard-layout";
import { DashboardPage } from "@/features/dashboard/dashboard-page/dashboard-page";
import { DashboardPending } from "@/features/dashboard/dashboard-page/dashboard-pending";
import { MONTH_KEY_PATTERN } from "@/lib/calendar";
import { optionalParam } from "@/lib/search-schema";

export const dashboardSearchSchema = z.object({
  month: optionalParam(z.string().regex(MONTH_KEY_PATTERN)),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context: { queryClient }, deps }) => {
    warmDashboard(queryClient, deps.month);
  },
  component: DashboardPage,
  pendingComponent: DashboardPending,
});
