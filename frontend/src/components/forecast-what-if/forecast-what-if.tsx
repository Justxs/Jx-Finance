import { useId } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { Currency } from "@/api/generated/model";
import { Disclosure } from "@/components/disclosure/disclosure";
import { useAppForm } from "@/components/form";
import { Button } from "@/components/ui/button/button";
import { useMoney, useShortDayIso } from "@/hooks/use-formatters";
import { isPositiveMoney, normalizeMoney, optionalPositiveMoney } from "@/lib/validation";

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
  const form = useAppForm({
    defaultValues: { amount: "", date: today },
    validators: [
      {
        run: z.object({ amount: optionalPositiveMoney(t), date: z.string() }),
        triggers: ["change"],
      },
    ],
    onSubmit: ({ value }) => {
      if (ready(value)) {
        onChange({ accountId, amount: -Number(normalizeMoney(value.amount)), date: value.date });
      }
    },
  });

  function ready(value: { amount: string; date: string }) {
    return isPositiveMoney(value.amount) && value.date >= today;
  }

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
      <form.AppForm>
        <form.FormShell className="flex flex-wrap items-end gap-3">
          <form.Field name="amount">
            {(field) => (
              <field.TextField
                id={`${id}-amount`}
                label={t("forecast.whatIfAmount")}
                className="w-36"
                inputMode="decimal"
              />
            )}
          </form.Field>
          <form.Field name="date">
            {(field) => (
              <field.DateField id={`${id}-date`} label={t("forecast.date")} className="w-44" />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => ready(state.values)}>
            {(canTry) => (
              <Button type="submit" variant="outline" size="sm" disabled={!canTry}>
                {t("forecast.whatIfTry")}
              </Button>
            )}
          </form.Subscribe>
          <p className="basis-full text-xs text-muted-foreground">
            {t("forecast.whatIfHint", { account: accountName })}
          </p>
        </form.FormShell>
      </form.AppForm>
    </Disclosure>
  );
}
