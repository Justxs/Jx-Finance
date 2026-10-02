import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Currency } from "@/api/generated/model";
import { Disclosure } from "@/components/disclosure/disclosure";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Button } from "@/components/ui/button/button";
import { DatePicker } from "@/components/ui/date-picker/date-picker";
import { Input } from "@/components/ui/input/input";
import { useMoney, useShortDayIso } from "@/hooks/use-formatters";
import { isPositiveMoney, normalizeMoney } from "@/lib/validation";

export interface WhatIf {
  accountId: string;
  amount: number;
  date: string;
}

interface Props {
  accountId: string;
  accountName: string;
  currency: Currency;
  today: string;
  whatIf: WhatIf | null;
  onChange: (whatIf: WhatIf | null) => void;
}

export function ForecastWhatIf({
  accountId,
  accountName,
  currency,
  today,
  whatIf,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDay = useShortDayIso();
  const id = useId();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const valid = isPositiveMoney(amount) && date >= today;

  if (whatIf) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <p role="status">
          {t("forecast.whatIfShown", {
            amount: money.format(-whatIf.amount, currency),
            date: formatDay(whatIf.date),
            account: accountName,
          })}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(null)}>
          {t("forecast.whatIfClear")}
        </Button>
      </div>
    );
  }

  return (
    <Disclosure summary={t("forecast.whatIfTitle")}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) {
            onChange({ accountId, amount: -Number(normalizeMoney(amount)), date });
          }
        }}
      >
        <FieldShell id={`${id}-amount`} label={t("forecast.whatIfAmount")} className="w-36">
          <Input
            id={`${id}-amount`}
            inputMode="decimal"
            value={amount}
            aria-invalid={amount !== "" && !isPositiveMoney(amount)}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FieldShell>
        <FieldShell id={`${id}-date`} label={t("forecast.date")} className="w-44">
          <DatePicker id={`${id}-date`} value={date} onChange={setDate} />
        </FieldShell>
        <Button type="submit" variant="outline" size="sm" disabled={!valid}>
          {t("forecast.whatIfTry")}
        </Button>
        <p className="basis-full text-xs text-muted-foreground">
          {t("forecast.whatIfHint", { account: accountName })}
        </p>
      </form>
    </Disclosure>
  );
}
