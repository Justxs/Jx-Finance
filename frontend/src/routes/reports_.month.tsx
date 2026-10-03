import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MonthPage } from "@/features/month-close/month-page/month-page";
import { MonthPagePending } from "@/features/month-close/month-page/month-page-pending";
import { warmMonthPage } from "@/features/month-close/month-page/month-queries";
import { MONTH_KEY_PATTERN } from "@/lib/calendar";
import { requireFeature } from "@/lib/feature-gate";
import { optionalParam } from "@/lib/search-schema";

export const monthPageSearchSchema = z.object({
  month: optionalParam(z.string().regex(MONTH_KEY_PATTERN)),
});

export const Route = createFileRoute("/reports_/month")({
  beforeLoad: requireFeature("monthClose"),
  validateSearch: monthPageSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context: { queryClient }, deps }) => {
    warmMonthPage(queryClient, deps.month);
  },
  component: MonthPage,
  pendingComponent: MonthPagePending,
});
