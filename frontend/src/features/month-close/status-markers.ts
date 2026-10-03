import { CircleAlert, CircleCheck, CircleDashed, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { MonthCloseMonthStatus, MonthReviewResponse } from "@/api/generated/model";
import { openLineCount } from "@/features/month-close/close-checklist/close-checklist";
import { useDateTime } from "@/hooks/use-formatters";
import { EXPENSE_TONE, INCOME_TONE } from "@/lib/tone";

export const statusMarkers = {
  notEnded: { icon: Clock, tone: "text-muted-foreground" },
  open: { icon: CircleDashed, tone: "text-muted-foreground" },
  closed: { icon: CircleCheck, tone: INCOME_TONE },
  closedChanged: { icon: CircleAlert, tone: EXPENSE_TONE },
} as const;

export function monthTitleKey(status: MonthCloseMonthStatus["status"], attention: number) {
  return status === "open" && attention > 0 ? "attention" : status;
}

export function useStatusLine() {
  const { t } = useTranslation();
  const dateTime = useDateTime();

  return function statusLine(review: MonthReviewResponse) {
    const lines = openLineCount(review.checklist);
    return {
      notEnded: t("monthClose.panel.notEnded"),
      open:
        lines === 0
          ? t("monthClose.panel.ready")
          : t("monthClose.page.openLines", { count: lines }),
      closed: t("monthClose.panel.closedOn", { date: dateTime(review.closedAt) }),
      closedChanged: t("monthClose.panel.changedSince", { date: dateTime(review.closedAt) }),
    }[review.status];
  };
}
