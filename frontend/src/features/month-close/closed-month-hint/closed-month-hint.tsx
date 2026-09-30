import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getMonthCloseYearSuspenseQueryOptions } from "@/api/generated";
import { isClosedStatus } from "@/features/month-close/status-markers";
import { useMonthName } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { MONTH_KEY_PATTERN, monthKeyOfIso, yearOf } from "@/lib/calendar";
import { silentQuery } from "@/lib/query-client";

interface Props {
  date: string;
  children: (hint: string | undefined) => ReactNode;
}

export function ClosedMonthHint({ date, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const monthName = useMonthName();
  const enabled = useFeature("monthClose");
  const key = monthKeyOfIso(date);
  const valid = MONTH_KEY_PATTERN.test(key);
  const year = yearOf(key);

  const months = useQuery({
    ...getMonthCloseYearSuspenseQueryOptions({ year }),
    ...silentQuery,
    enabled: enabled && valid,
    staleTime: 60_000,
  });

  const entry = months.data?.months.find((month) => monthKeyOfIso(month.month) === key);

  return children(
    enabled && valid && entry && isClosedStatus(entry.status)
      ? t("monthClose.editHint", { month: monthName(key) })
      : undefined,
  );
}
