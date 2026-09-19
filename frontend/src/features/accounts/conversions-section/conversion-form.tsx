import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useExchangeRate } from "@/api/generated";
import { type AccountResponse, Currency } from "@/api/generated/model";
import { createConversionBodyDescriptionMax } from "@/api/schemas/conversions/conversions.zod";
import { useAppForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  EMPTY_VALUE,
  useIsoDate,
  useRateFormat,
  useUsableCurrencies,
} from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { submitToServer } from "@/lib/form-server-errors";
import {
  isPositiveMoney,
  normalizeMoney,
  optionalPositiveMoney,
  optionalText,
  positiveMoney,
  requiredValue,
} from "@/lib/validation";
import { heldCurrencies } from "../held-currencies";

interface ConversionFormValues {
  accountId: string;
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  date: string;
  description: string | null;
  feeAmount: string | null;
  feeCurrency: Currency | null;
}

interface FormValues {
  accountId: string;
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  date: string;
  description: string;
  feeAmount: string;
  feeCurrency: Currency;
}

interface Props {
  accounts: AccountResponse[];
  accountId?: string;
  pending: boolean;
  onSubmit: (values: ConversionFormValues) => Promise<unknown> | void;
  onCancel?: () => void;
}

interface RateProps {
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  date: string;
}

function otherCurrency(
  account: AccountResponse | undefined,
  sold: Currency,
  usable: readonly Currency[],
): Currency {
  const held = heldCurrencies(account).find((currency) => currency !== sold);

  return held ?? usable.find((currency) => currency !== sold) ?? sold;
}

function buildValues(value: FormValues): ConversionFormValues {
  const hasFee = value.feeAmount.trim() !== "";

  return {
    accountId: value.accountId,
    fromAmount: value.fromAmount,
    fromCurrency: value.fromCurrency,
    toAmount: value.toAmount,
    toCurrency: value.toCurrency,
    date: value.date,
    description: value.description.trim() || null,
    feeAmount: hasFee ? value.feeAmount : null,
    feeCurrency: hasFee ? value.feeCurrency : null,
  };
}

function ConversionRate({
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  date,
}: Readonly<RateProps>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const rateFormat = useRateFormat();
  const reference = useExchangeRate(
    { from: fromCurrency, to: toCurrency, date },
    {
      query: {
        enabled: fromCurrency !== toCurrency && date !== "",
        retry: false,
        throwOnError: false,
        meta: { silent: true },
      },
    },
  );

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const hasAmounts = isPositiveMoney(fromAmount) && isPositiveMoney(toAmount);
  const yourRate = hasAmounts
    ? Number(normalizeMoney(toAmount)) / Number(normalizeMoney(fromAmount))
    : null;

  return (
    <dl className="col-span-full space-y-1 border-y border-rule py-2.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t("conversions.yourRate")}</dt>
        <dd className="font-semibold tabular-nums">
          {yourRate === null ? EMPTY_VALUE : `1 ${from} = ${rateFormat.format(yourRate)} ${to}`}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t("conversions.referenceRate")}</dt>
        <dd className="tabular-nums" aria-busy={reference.isFetching}>
          {reference.data
            ? `1 ${from} = ${rateFormat.format(Number(reference.data.rate))} ${to} · ${formatDate(reference.data.asOf)}`
            : EMPTY_VALUE}
        </dd>
      </div>
    </dl>
  );
}

export function ConversionForm({
  accounts,
  accountId,
  pending,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const usable = useUsableCurrencies();

  const schema = z
    .object({
      accountId: requiredValue(t),
      fromAmount: positiveMoney(t),
      fromCurrency: z.enum(Currency),
      toAmount: positiveMoney(t),
      toCurrency: z.enum(Currency),
      date: requiredValue(t),
      description: optionalText(t, createConversionBodyDescriptionMax),
      feeAmount: optionalPositiveMoney(t),
      feeCurrency: z.enum(Currency),
    })
    .refine((value) => value.fromCurrency !== value.toCurrency, {
      message: t("conversions.sameCurrencyError"),
      path: ["toCurrency"],
    });

  const initialAccount = accounts.find((account) => account.id === accountId) ?? accounts[0];
  const initialSold = initialAccount?.currency ?? "eur";

  const defaultValues: FormValues = {
    accountId: initialAccount?.id ?? "",
    fromAmount: "",
    fromCurrency: initialSold,
    toAmount: "",
    toCurrency: otherCurrency(initialAccount, initialSold, usable),
    date: today,
    description: "",
    feeAmount: "",
    feeCurrency: initialSold,
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) =>
      submitToServer(submission, () => onSubmit(buildValues(submission.value))),
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        className="form-grid"
      >
        <form.Field name="accountId">
          {(field) => (
            <field.SelectFieldControl
              id="conversion-account"
              label={t("transactions.account")}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              onValueChange={(value) => {
                const next = accounts.find((account) => account.id === value);
                const sold = next?.currency ?? form.getFieldValue("fromCurrency");
                form.setFieldValue("fromCurrency", sold);
                form.setFieldValue("toCurrency", otherCurrency(next, sold, usable));
                form.setFieldValue("feeCurrency", sold);
              }}
            />
          )}
        </form.Field>

        <form.Field name="date">
          {(field) => <field.DateField id="conversion-date" label={t("transactions.date")} />}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.accountId}>
          {(selectedAccountId) => {
            const held = heldCurrencies(
              accounts.find((account) => account.id === selectedAccountId),
            );

            return (
              <>
                <form.Field name="fromCurrency">
                  {(currencyField) => (
                    <form.Field name="fromAmount">
                      {(field) => (
                        <field.MoneyAmountField
                          id="conversion-from-amount"
                          label={t("conversions.sold")}
                          currencyLabel={t("conversions.soldCurrency")}
                          currencyField={currencyField}
                          preferred={held}
                          onCurrencyChange={(value) => {
                            if (
                              form.getFieldValue("feeCurrency") !== form.getFieldValue("toCurrency")
                            ) {
                              form.setFieldValue("feeCurrency", value);
                            }
                          }}
                        />
                      )}
                    </form.Field>
                  )}
                </form.Field>

                <form.Field name="toCurrency">
                  {(currencyField) => (
                    <form.Field name="toAmount">
                      {(field) => (
                        <field.MoneyAmountField
                          id="conversion-to-amount"
                          label={t("conversions.bought")}
                          currencyLabel={t("conversions.boughtCurrency")}
                          currencyField={currencyField}
                          touchedOnly
                          preferred={held}
                          onCurrencyChange={(value) => {
                            if (
                              form.getFieldValue("feeCurrency") !==
                              form.getFieldValue("fromCurrency")
                            ) {
                              form.setFieldValue("feeCurrency", value);
                            }
                          }}
                        />
                      )}
                    </form.Field>
                  )}
                </form.Field>
              </>
            );
          }}
        </form.Subscribe>

        <form.Subscribe
          selector={(state) => ({
            fromAmount: state.values.fromAmount,
            fromCurrency: state.values.fromCurrency,
            toAmount: state.values.toAmount,
            toCurrency: state.values.toCurrency,
            date: state.values.date,
          })}
        >
          {(values) => <ConversionRate {...values} />}
        </form.Subscribe>

        <form.Subscribe
          selector={(state) => [state.values.fromCurrency, state.values.toCurrency] as const}
        >
          {(tradedCurrencies) => (
            <form.Field name="feeCurrency">
              {(currencyField) => (
                <form.Field name="feeAmount">
                  {(field) => (
                    <field.MoneyAmountField
                      id="conversion-fee"
                      label={t("conversions.fee")}
                      currencyLabel={t("conversions.feeCurrency")}
                      currencyField={currencyField}
                      hint={t("conversions.feeHint")}
                      only={tradedCurrencies}
                    />
                  )}
                </form.Field>
              )}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="description">
          {(field) => (
            <field.TextField id="conversion-description" label={t("transactions.description")} />
          )}
        </form.Field>

        <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("actions.cancel")}
            </Button>
          ) : null}
          <form.SubmitButton pending={pending}>{t("conversions.submit")}</form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
