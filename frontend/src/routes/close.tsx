import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getMonthCloseYearSuspenseQueryOptions,
  getMonthReviewSuspenseQueryOptions,
} from "@/api/generated";
import { MonthClosePage } from "@/features/month-close/month-close-page/month-close-page";
import { latestEndedMonth, MONTH_KEY_PATTERN, yearOf } from "@/features/month-close/month-key";
import { requireFeature } from "@/lib/feature-gate";
import { todayDateIn, warm, warmWithSettings } from "@/lib/route-prefetch";
import { optionalParam } from "@/lib/search-schema";

export const closeSearchSchema = z.object({
  month: optionalParam(z.string().regex(MONTH_KEY_PATTERN)),
});

export const Route = createFileRoute("/close")({
  beforeLoad: requireFeature("monthClose"),
  validateSearch: closeSearchSchema,
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context: { queryClient }, deps }) => {
    warmWithSettings(queryClient, (settings) => {
      const month = deps.month ?? latestEndedMonth(todayDateIn(settings));
      warm(queryClient, getMonthCloseYearSuspenseQueryOptions({ year: yearOf(month) }));
      if (deps.month) {
        warm(queryClient, getMonthReviewSuspenseQueryOptions(deps.month));
      }
    });
  },
  component: MonthClosePage,
});
