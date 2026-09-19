import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useGetExchangeRate } from "@/api/generated";
import { type AccountResponse, Currency } from "@/api/generated/model";
import { createConversionBodyDescriptionMax } from "@/api/schemas/conversions/conversions.zod";
import { MoneyField } from "@/components/money-field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPTY_VALUE,
  useIsoDate,
  useRateFormat,
  useUsableCurrencies,
} from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { isPositiveMoney, normalizeMoney } from "@/lib/validation";
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
  onSubmit: (values: ConversionFormValues) => void;
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
  const reference = useGetExchangeRate(
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
      accountId: z.string().min(1, t("validation.required")),
      fromAmount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
      fromCurrency: z.enum(Currency),
      toAmount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
      toCurrency: z.enum(Currency),
      date: z.string().min(1, t("validation.required")),
      description: z
        .string()
        .max(
          createConversionBodyDescriptionMax,
          t("validation.maxLength", { max: createConversionBodyDescriptionMax }),
        ),
      feeAmount: z
        .string()
        .refine(
          (value) => value.trim() === "" || isPositiveMoney(value),
          t("validation.positiveMoney"),
        ),
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

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      const hasFee = value.feeAmount.trim() !== "";

      onSubmit({
        accountId: value.accountId,
        fromAmount: value.fromAmount,
        fromCurrency: value.fromCurrency,
        toAmount: value.toAmount,
        toCurrency: value.toCurrency,
        date: value.date,
        description: value.description.trim() || null,
        feeAmount: hasFee ? value.feeAmount : null,
        feeCurrency: hasFee ? value.feeCurrency : null,
      });
    },
  });

  return (
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
          <div className="space-y-1.5">
            <Label htmlFor="conversion-account">{t("transactions.account")}</Label>
            <SelectField
              id="conversion-account"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(value) => {
                const next = accounts.find((account) => account.id === value);
                const sold = next?.currency ?? form.getFieldValue("fromCurrency");
                field.handleChange(value);
                form.setFieldValue("fromCurrency", sold);
                form.setFieldValue("toCurrency", otherCurrency(next, sold, usable));
                form.setFieldValue("feeCurrency", sold);
              }}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="date">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="conversion-date">{t("transactions.date")}</Label>
            <DatePicker
              id="conversion-date"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.accountId}>
        {(selectedAccountId) => {
          const held = heldCurrencies(accounts.find((account) => account.id === selectedAccountId));

          return (
            <>
              <form.Field name="fromAmount">
                {(field) => (
                  <form.Field name="fromCurrency">
                    {(currencyField) => (
                      <MoneyField
                        id="conversion-from-amount"
                        label={t("conversions.sold")}
                        value={field.value}
                        error={field.errors[0]?.message}
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        currency={currencyField.value}
                        currencyLabel={t("conversions.soldCurrency")}
                        preferred={held}
                        onCurrencyChange={(value) => {
                          currencyField.handleChange(value);
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

              <form.Field name="toAmount">
                {(field) => (
                  <form.Field name="toCurrency">
                    {(currencyField) => (
                      <MoneyField
                        id="conversion-to-amount"
                        label={t("conversions.bought")}
                        value={field.value}
                        error={field.meta.isTouched ? field.errors[0]?.message : undefined}
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        currency={currencyField.value}
                        currencyLabel={t("conversions.boughtCurrency")}
                        currencyError={currencyField.errors[0]?.message}
                        preferred={held}
                        onCurrencyChange={(value) => {
                          currencyField.handleChange(value);
                          if (
                            form.getFieldValue("feeCurrency") !== form.getFieldValue("fromCurrency")
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
          <form.Field name="feeAmount">
            {(field) => (
              <form.Field name="feeCurrency">
                {(currencyField) => (
                  <MoneyField
                    id="conversion-fee"
                    label={t("conversions.fee")}
                    hint={t("conversions.feeHint")}
                    value={field.value}
                    error={field.errors[0]?.message}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    currency={currencyField.value}
                    currencyLabel={t("conversions.feeCurrency")}
                    only={tradedCurrencies}
                    onCurrencyChange={currencyField.handleChange}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="description">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="conversion-description">{t("transactions.description")}</Label>
            <Input
              id="conversion-description"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={
                field.errors.length > 0 ? "conversion-description-error" : undefined
              }
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="conversion-description-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit}>
              {t("conversions.submit")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
