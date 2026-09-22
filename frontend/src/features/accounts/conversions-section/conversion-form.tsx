import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useExchangeRate } from "@/api/generated";
import {
  type AccountResponse,
  type CategoryResponse,
  type ConversionResponse,
  Currency,
} from "@/api/generated/model";
import { createConversionBodyDescriptionMax } from "@/api/schemas/conversions/conversions.zod";
import { MoneyPairField, useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import {
  EMPTY_VALUE,
  useIsoDate,
  useRateFormat,
  useUsableCurrencies,
} from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { hasServerErrorCode } from "@/lib/form-server-errors";
import { silentQuery } from "@/lib/mutations";
import { namedOptions, withMissingOption } from "@/lib/options";
import {
  isPositiveMoney,
  normalizeMoney,
  optionalPositiveMoney,
  optionalText,
  positiveMoney,
  requiredValue,
} from "@/lib/validation";
import { heldCurrencies } from "../held-currencies";

export interface ConversionFormValues {
  accountId: string;
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  date: string;
  description: string | null;
  feeAmount: string | null;
  feeCurrency: Currency | null;
  feeCategoryId: string | null;
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
  feeCategoryId: string;
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  accountId?: string;
  conversion?: ConversionResponse;
  error?: unknown;
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
    feeCategoryId: hasFee && value.feeCategoryId !== "" ? value.feeCategoryId : null,
  };
}

function valuesOf(conversion: ConversionResponse): FormValues {
  return {
    accountId: conversion.accountId,
    fromAmount: conversion.fromAmount,
    fromCurrency: conversion.fromCurrency,
    toAmount: conversion.toAmount,
    toCurrency: conversion.toCurrency,
    date: conversion.date,
    description: conversion.description ?? "",
    feeAmount: conversion.feeAmount ?? "",
    feeCurrency: conversion.feeCurrency ?? conversion.fromCurrency,
    feeCategoryId: conversion.feeCategoryId ?? "",
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
      query: { enabled: fromCurrency !== toCurrency && date !== "", ...silentQuery },
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
  categories,
  accountId,
  conversion,
  error,
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
      feeCategoryId: z.string(),
    })
    .refine((value) => value.fromCurrency !== value.toCurrency, {
      message: t("conversions.sameCurrencyError"),
      path: ["toCurrency"],
    });

  const initialAccount = accounts.find((account) => account.id === accountId) ?? accounts[0];
  const initialSold = initialAccount?.currency ?? DEFAULT_CURRENCY;

  const defaultValues: FormValues = conversion
    ? valuesOf(conversion)
    : {
        accountId: initialAccount?.id ?? "",
        fromAmount: "",
        fromCurrency: initialSold,
        toAmount: "",
        toCurrency: otherCurrency(initialAccount, initialSold, usable),
        date: today,
        description: "",
        feeAmount: "",
        feeCurrency: initialSold,
        feeCategoryId: "",
      };

  const accountOptions = withMissingOption(
    namedOptions(accounts),
    conversion?.accountId,
    t("transfers.unavailableAccount"),
  );
  const feeCategoryOptions = namedOptions(
    categories.filter((category) => category.type === "expense"),
    t("recurringBills.noCategory"),
  );

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => onSubmit(buildValues(value)),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="accountId">
          {(field) => (
            <field.SelectFieldControl
              id="conversion-account"
              label={t("transactions.account")}
              hint={conversion ? t("conversions.accountFixedHint") : undefined}
              disabled={conversion !== undefined}
              options={accountOptions}
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
                <MoneyPairField
                  form={form}
                  fields={{ amount: "fromAmount", currency: "fromCurrency" }}
                  id="conversion-from-amount"
                  label={t("conversions.sold")}
                  currencyLabel={t("conversions.soldCurrency")}
                  preferred={held}
                  onCurrencyChange={(value) => {
                    if (form.getFieldValue("feeCurrency") !== form.getFieldValue("toCurrency")) {
                      form.setFieldValue("feeCurrency", value);
                    }
                  }}
                />

                <MoneyPairField
                  form={form}
                  fields={{ amount: "toAmount", currency: "toCurrency" }}
                  id="conversion-to-amount"
                  label={t("conversions.bought")}
                  currencyLabel={t("conversions.boughtCurrency")}
                  touchedOnly
                  preferred={held}
                  onCurrencyChange={(value) => {
                    if (form.getFieldValue("feeCurrency") !== form.getFieldValue("fromCurrency")) {
                      form.setFieldValue("feeCurrency", value);
                    }
                  }}
                />
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
            <MoneyPairField
              form={form}
              fields={{ amount: "feeAmount", currency: "feeCurrency" }}
              id="conversion-fee"
              label={t("conversions.fee")}
              currencyLabel={t("conversions.feeCurrency")}
              hint={conversion ? t("conversions.feeEditHint") : t("conversions.feeHint")}
              only={tradedCurrencies}
            />
          )}
        </form.Subscribe>

        <form.Subscribe selector={(state) => state.values.feeAmount.trim() === ""}>
          {(noFee) => (
            <form.Field name="feeCategoryId">
              {(field) => (
                <field.SelectFieldControl
                  id="conversion-fee-category"
                  label={t("conversions.feeCategory")}
                  disabled={noFee}
                  options={feeCategoryOptions}
                />
              )}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="description">
          {(field) => (
            <field.TextField
              id="conversion-description"
              label={t("transactions.description")}
              className="col-span-full"
            />
          )}
        </form.Field>

        {hasServerErrorCode(error, "transaction.splitNotAllowed") ? (
          <FormError message={t("conversions.feeSplitError")} />
        ) : (
          <FormError error={error} />
        )}

        <form.FormActions
          span
          pending={pending}
          submitLabel={conversion ? t("actions.save") : t("conversions.submit")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
