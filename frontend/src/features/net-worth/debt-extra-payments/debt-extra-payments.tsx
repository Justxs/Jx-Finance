import { useTranslation } from "react-i18next";
import type { Currency, DebtScheduleParams, DebtScheduleResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { DatePicker } from "@/components/ui/date-picker/date-picker";
import { Input } from "@/components/ui/input/input";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { shellAria } from "@/lib/field-aria";
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
  currency: Currency;
  onChange: (field: keyof ExtraPaymentDraft, value: string) => void;
}

export function DebtExtraPayments({
  idPrefix,
  draft,
  schedule,
  currency,
  onChange,
}: Readonly<Props>) {
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
  const lower = schedule.lowerPayment;

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
            {...shellAria({ id: `${idPrefix}-monthly`, error: monthlyError })}
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
            {...shellAria({ id: `${idPrefix}-lump-sum`, error: lumpSumError })}
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
            {...shellAria({ id: `${idPrefix}-lump-sum-date`, error: dateError })}
            onChange={(value) => onChange("lumpSumDate", value)}
          />
        </FieldShell>
      </div>
      <div role="status" className="text-sm">
        {faster && lower && schedule.interestSaved !== null && schedule.paymentsSaved !== null ? (
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Outcome
              label={t("netWorth.schedule.shorterTerm")}
              value={formatDate(faster.payoffDate)}
              detail={t("netWorth.schedule.savings", {
                count: schedule.paymentsSaved,
                amount: money.format(Number(schedule.interestSaved), currency),
              })}
            />
            {lower.payment !== null &&
            lower.paymentBefore !== null &&
            lower.paymentFrom !== null ? (
              <Outcome
                label={t("netWorth.schedule.lowerPayment")}
                value={money.format(Number(lower.payment), currency)}
                detail={t("netWorth.schedule.paymentSavings", {
                  before: money.format(Number(lower.paymentBefore), currency),
                  date: formatDate(lower.paymentFrom),
                  amount: money.format(Number(lower.interestSaved), currency),
                  payoff: formatDate(lower.payoffDate),
                })}
              />
            ) : (
              <Outcome
                label={t("netWorth.schedule.lowerPayment")}
                value={formatDate(lower.payoffDate)}
                detail={t("netWorth.schedule.paidOffSavings", {
                  amount: money.format(Number(lower.interestSaved), currency),
                })}
              />
            )}
          </dl>
        ) : (
          <p className="text-muted-foreground">{t("netWorth.schedule.noSavings")}</p>
        )}
      </div>
    </div>
  );
}

interface OutcomeProps {
  label: string;
  value: string;
  detail: string;
}

function Outcome({ label, value, detail }: Readonly<OutcomeProps>) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold wrap-break-word tabular-nums">{value}</dd>
      <dd className="mt-0.5 text-muted-foreground">{detail}</dd>
    </div>
  );
}
