import type { MonthCloseMonthStatus } from "@/api/generated/model";

export function isClosedStatus(status: MonthCloseMonthStatus["status"]) {
  return status === "closed" || status === "closedChanged";
}
