import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCloseMonth } from "@/api/generated";
import type { MonthReviewResponse } from "@/api/generated/model";
import { isClosedStatus } from "@/features/month-close/status-markers";
import { useMonthName } from "@/hooks/use-formatters";
import { silentMutation } from "@/lib/mutations";

export function useMonthCloser(month: string, review: MonthReviewResponse) {
  const { t } = useTranslation();
  const monthName = useMonthName()(month);
  const closed = isClosedStatus(review.status);

  return useCloseMonth({
    mutation: {
      ...silentMutation,
      onSuccess: () =>
        toast.success(
          t(closed ? "monthClose.form.reclosed" : "monthClose.form.closed", { month: monthName }),
        ),
    },
  });
}
