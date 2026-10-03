import type { MonthReviewResponse } from "@/api/generated/model";
import {
  getCloseMonthMockHandler,
  getMonthCloseYearMockHandler,
  getMonthReviewMockHandler,
  getReopenMonthMockHandler,
  getUpdateMonthNoteMockHandler,
} from "@/api/generated/month-close/month-close.msw";
import {
  MONTH_CLOSE_CHANGED_MONTH,
  MONTH_CLOSE_MONTH,
  MONTH_CLOSE_RUNNING_MONTH,
  closedChangedMonthReview,
  closedMonthReview,
  monthCloseYearOf,
  notEndedMonthReview,
  openMonthReview,
} from "@/storybook/fixtures";
import { query, readBody, text } from "./http";

export function monthOf(params: Record<string, string | readonly string[] | undefined>) {
  const value = params.month;
  return typeof value === "string" ? value : MONTH_CLOSE_MONTH;
}

export function reviewOf(month: string): MonthReviewResponse {
  if (month === MONTH_CLOSE_MONTH) {
    return openMonthReview;
  }
  if (month === MONTH_CLOSE_CHANGED_MONTH) {
    return { ...closedChangedMonthReview, month: `${month}-01` };
  }
  if (month >= MONTH_CLOSE_RUNNING_MONTH) {
    return { ...notEndedMonthReview, month: `${month}-01` };
  }
  return { ...closedMonthReview, month: `${month}-01` };
}

function closedWith(month: string, note: string | null): MonthReviewResponse {
  return { ...closedMonthReview, month: `${month}-01`, note };
}

export const monthCloseHandlers = [
  getMonthCloseYearMockHandler(({ request }) =>
    monthCloseYearOf(Number(query(request).get("year") ?? "2026")),
  ),
  getMonthReviewMockHandler(({ params }) => reviewOf(monthOf(params))),
  getCloseMonthMockHandler(async ({ params, request }) =>
    closedWith(monthOf(params), text((await readBody(request)).note)),
  ),
  getUpdateMonthNoteMockHandler(async ({ params, request }) =>
    closedWith(monthOf(params), text((await readBody(request)).note)),
  ),
  getReopenMonthMockHandler(),
];
