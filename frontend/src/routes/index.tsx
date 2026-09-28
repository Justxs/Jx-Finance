import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { warmDashboard } from "@/features/dashboard/dashboard-layout";
import { DashboardPage } from "@/features/dashboard/dashboard-page/dashboard-page";
import { MONTH_KEY_PATTERN } from "@/features/month-close/month-key";
import { optionalParam } from "@/lib/search-schema";

export const dashboardSearchSchema = z.object({
  month: optionalParam(z.string().regex(MONTH_KEY_PATTERN)),
});

export const Route = createFileRoute("/")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context: { queryClient }, deps }) => {
    warmDashboard(queryClient, deps.month);
  },
  component: DashboardPage,
});
