import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateConversion, useUpdateConversion } from "@/api/generated";
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
import { useUsableCurrencies } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { hasServerErrorCode } from "@/lib/form-server-errors";
import { silent, upsert } from "@/lib/mutations";
import { namedOptions, withMissingOption } from "@/lib/options";
import {
  optionalPositiveMoney,
  optionalText,
  positiveMoney,
  requiredValue,
} from "@/lib/validation";
import { heldCurrencies } from "../held-currencies";
import { ConversionRate } from "./conversion-rate";
import {
  type ConversionFieldValues,
  buildValues,
  otherCurrency,
  valuesOf,
} from "./conversion-values";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  accountId?: string;
  conversion?: ConversionResponse;
  onClose: () => void;
}

export function ConversionForm({
  accounts,
  categories,
  accountId,
  conversion,
  onClose,
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

  const defaultValues: ConversionFieldValues = conversion
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

  const { create, update, pending, error } = upsert(
    useCreateConversion(silent({ onSuccess: onClose })),
    useUpdateConversion(silent({ onSuccess: onClose })),
  );

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const { accountId: chosenAccountId, ...data } = buildValues(value);
      return conversion
        ? update({ id: conversion.id, data })
        : create({ data: { ...data, accountId: chosenAccountId } });
    },
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
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
