import { CircleAlert, CircleCheck, CircleDashed, Clock } from "lucide-react";
import type { MonthCloseMonthStatus } from "@/api/generated/model";
import { EXPENSE_TONE, INCOME_TONE } from "@/lib/tone";

export const statusMarkers = {
  notEnded: { icon: Clock, tone: "text-muted-foreground" },
  open: { icon: CircleDashed, tone: "text-muted-foreground" },
  closed: { icon: CircleCheck, tone: INCOME_TONE },
  closedChanged: { icon: CircleAlert, tone: EXPENSE_TONE },
} as const;

export function isClosedStatus(status: MonthCloseMonthStatus["status"]) {
  return status === "closed" || status === "closedChanged";
}
