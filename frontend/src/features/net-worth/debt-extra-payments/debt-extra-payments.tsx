import { useTranslation } from "react-i18next";
import type { DebtScheduleParams, DebtScheduleResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { DatePicker } from "@/components/ui/date-picker/date-picker";
import { Input } from "@/components/ui/input/input";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { isPositiveMoney, normalizeMoney } from "@/lib/validation";

export interface ExtraPaymentDraft {
  extraMonthly: string;
  lumpSum: string;
  lumpSumDate: string;
}

export const noExtraPayments: ExtraPaymentDraft = {
  extraMonthly: "",
  lumpSum: "",
  lumpSumDate: "",
};

const TYPING_WAIT_MS = 400;

export function extraPaymentParams(draft: ExtraPaymentDraft): DebtScheduleParams {
  const params: DebtScheduleParams = {};
  if (isPositiveMoney(draft.extraMonthly)) {
    params.extraMonthly = normalizeMoney(draft.extraMonthly);
  }
  if (isPositiveMoney(draft.lumpSum) && draft.lumpSumDate) {
    params.lumpSum = normalizeMoney(draft.lumpSum);
    params.lumpSumDate = draft.lumpSumDate;
  }
  return params;
}

interface Props {
  idPrefix: string;
  draft: ExtraPaymentDraft;
  schedule: DebtScheduleResponse;
  onChange: (field: keyof ExtraPaymentDraft, value: string) => void;
}

export function DebtExtraPayments({ idPrefix, draft, schedule, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const monthly = useDebouncedDraft(
    draft.extraMonthly,
    (value) => onChange("extraMonthly", value),
    TYPING_WAIT_MS,
  );
  const lumpSum = useDebouncedDraft(
    draft.lumpSum,
    (value) => onChange("lumpSum", value),
    TYPING_WAIT_MS,
  );

  function moneyError(value: string) {
    return value.trim() === "" || isPositiveMoney(value)
      ? undefined
      : t("validation.positiveMoney");
  }

  const monthlyError = moneyError(monthly.draft);
  const lumpSumError = moneyError(lumpSum.draft);
  const dateError =
    isPositiveMoney(lumpSum.draft) && !draft.lumpSumDate
      ? t("netWorth.schedule.lumpSumDateNeeded")
      : undefined;
  const faster = schedule.withExtra;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))] items-start gap-4">
        <FieldShell
          id={`${idPrefix}-monthly`}
          label={t("netWorth.schedule.extraMonthly")}
          error={monthlyError}
        >
          <Input
            id={`${idPrefix}-monthly`}
            inputMode="decimal"
            placeholder="0.00"
            value={monthly.draft}
            aria-invalid={Boolean(monthlyError)}
            aria-describedby={monthlyError ? `${idPrefix}-monthly-error` : undefined}
            onChange={(event) => monthly.change(event.target.value)}
          />
        </FieldShell>
        <FieldShell
          id={`${idPrefix}-lump-sum`}
          label={t("netWorth.schedule.lumpSum")}
          error={lumpSumError}
        >
          <Input
            id={`${idPrefix}-lump-sum`}
            inputMode="decimal"
            placeholder="0.00"
            value={lumpSum.draft}
            aria-invalid={Boolean(lumpSumError)}
            aria-describedby={lumpSumError ? `${idPrefix}-lump-sum-error` : undefined}
            onChange={(event) => lumpSum.change(event.target.value)}
          />
        </FieldShell>
        <FieldShell
          id={`${idPrefix}-lump-sum-date`}
          label={t("netWorth.schedule.lumpSumDate")}
          error={dateError}
        >
          <DatePicker
            id={`${idPrefix}-lump-sum-date`}
            value={draft.lumpSumDate}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? `${idPrefix}-lump-sum-date-error` : undefined}
            onChange={(value) => onChange("lumpSumDate", value)}
          />
        </FieldShell>
      </div>
      <p role="status" className="text-sm">
        {faster && schedule.interestSaved !== null && schedule.paymentsSaved !== null ? (
          <span className="font-medium">
            {t("netWorth.schedule.savings", {
              date: formatDate(faster.payoffDate),
              count: schedule.paymentsSaved,
              amount: money.format(Number(schedule.interestSaved)),
            })}
          </span>
        ) : (
          <span className="text-muted-foreground">{t("netWorth.schedule.noSavings")}</span>
        )}
      </p>
    </div>
  );
}
