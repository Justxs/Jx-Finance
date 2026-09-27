import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { getMonthCloseYearSuspenseQueryOptions } from "@/api/generated";
import { useMonthName } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { parseIso } from "@/lib/calendar";
import { silentQuery } from "@/lib/mutations";
import { isClosedStatus, monthKeyOfIso } from "../month-key";

interface Props {
  date: string;
  children: (hint: string | undefined) => ReactNode;
}

export function ClosedMonthHint({ date, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const monthName = useMonthName();
  const enabled = useFeature("monthClose");
  const year = parseIso(date)?.getFullYear() ?? 0;
  const valid = year >= 2000 && year <= 2999;

  const months = useQuery({
    ...getMonthCloseYearSuspenseQueryOptions({ year }),
    ...silentQuery,
    enabled: enabled && valid,
    staleTime: 60_000,
  });

  const key = monthKeyOfIso(date);
  const entry = months.data?.months.find((month) => monthKeyOfIso(month.month) === key);

  return children(
    enabled && valid && entry && isClosedStatus(entry.status)
      ? t("monthClose.editHint", { month: monthName(key) })
      : undefined,
  );
}
