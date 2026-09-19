import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { type AccountResponse, Currency } from "@/api/generated/model";
import { MoneyField } from "@/components/money-field";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeature, useToday } from "@/hooks/use-settings";
import { isPositiveMoney } from "@/lib/validation";
import { heldCurrencies } from "../held-currencies";

interface TransferFormValues {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: Currency;
  receivedAmount: string | null;
  receivedCurrency: Currency;
  date: string;
  description: string | null;
}

interface FormValues {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: Currency;
  receivedAmount: string;
  receivedCurrency: Currency;
  date: string;
  description: string;
}

interface Props {
  accounts: AccountResponse[];
  pending: boolean;
  onSubmit: (values: TransferFormValues) => void;
  onCancel?: () => void;
}

export function TransferForm({ accounts, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const multiCurrency = useFeature("multiCurrency");

  const schema = z
    .object({
      fromAccountId: z.string().min(1, t("validation.required")),
      toAccountId: z.string().min(1, t("validation.required")),
      amount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
      currency: z.enum(Currency),
      receivedAmount: z.string(),
      receivedCurrency: z.enum(Currency),
      date: z.string().min(1, t("validation.required")),
      description: z.string(),
    })
    .refine((value) => value.fromAccountId !== value.toAccountId, {
      message: t("transfers.sameAccountError"),
      path: ["toAccountId"],
    })
    .refine(
      (value) => value.currency === value.receivedCurrency || isPositiveMoney(value.receivedAmount),
      { message: t("validation.positiveMoney"), path: ["receivedAmount"] },
    );

  function currencyOf(accountId: string): Currency {
    return accounts.find((account) => account.id === accountId)?.currency ?? "eur";
  }

  function heldBy(accountId: string) {
    return heldCurrencies(accounts.find((account) => account.id === accountId));
  }

  const defaultValues: FormValues = {
    fromAccountId: accounts[0]?.id ?? "",
    toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
    amount: "",
    currency: accounts[0]?.currency ?? "eur",
    receivedAmount: "",
    receivedCurrency: (accounts[1] ?? accounts[0])?.currency ?? "eur",
    date: today,
    description: "",
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      onSubmit({
        fromAccountId: value.fromAccountId,
        toAccountId: value.toAccountId,
        amount: value.amount,
        currency: value.currency,
        receivedAmount: value.currency === value.receivedCurrency ? null : value.receivedAmount,
        receivedCurrency: value.receivedCurrency,
        date: value.date,
        description: value.description.trim() || null,
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
      <form.Field name="fromAccountId">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-from">{t("transfers.from")}</Label>
            <SelectField
              id="transfer-from"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(value) => {
                field.handleChange(value);
                form.setFieldValue("currency", currencyOf(value));
              }}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="toAccountId">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-to">{t("transfers.to")}</Label>
            <SelectField
              id="transfer-to"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "transfer-to-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(value) => {
                field.handleChange(value);
                form.setFieldValue("receivedCurrency", currencyOf(value));
              }}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            />
            <FieldError id="transfer-to-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.fromAccountId}>
        {(fromAccountId) => (
          <form.Field name="amount">
            {(field) => (
              <form.Field name="currency">
                {(currencyField) => (
                  <MoneyField
                    id="transfer-amount"
                    label={t("transactions.amount")}
                    value={field.value}
                    error={field.errors[0]?.message}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    currency={currencyField.value}
                    currencyLabel={t("transfers.sentCurrency")}
                    preferred={heldBy(fromAccountId)}
                    onCurrencyChange={currencyField.handleChange}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Subscribe
        selector={(state) =>
          [state.values.currency, state.values.receivedCurrency, state.values.toAccountId] as const
        }
      >
        {([currency, receivedCurrency, toAccountId]) =>
          multiCurrency || currency !== receivedCurrency ? (
            <form.Field name="receivedAmount">
              {(field) => (
                <form.Field name="receivedCurrency">
                  {(currencyField) => (
                    <MoneyField
                      id="transfer-received"
                      label={t("transfers.received")}
                      placeholder={
                        currency === receivedCurrency ? t("transfers.sameAsSent") : "0.00"
                      }
                      disabled={currency === receivedCurrency}
                      value={currency === receivedCurrency ? "" : field.value}
                      error={field.meta.isTouched ? field.errors[0]?.message : undefined}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                      currency={currencyField.value}
                      currencyLabel={t("transfers.receivedCurrency")}
                      preferred={heldBy(toAccountId)}
                      onCurrencyChange={currencyField.handleChange}
                    />
                  )}
                </form.Field>
              )}
            </form.Field>
          ) : null
        }
      </form.Subscribe>

      <form.Field name="date">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-date">{t("transactions.date")}</Label>
            <DatePicker
              id="transfer-date"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="col-span-full space-y-1.5">
            <Label htmlFor="transfer-description">{t("transactions.description")}</Label>
            <Input
              id="transfer-description"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
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
              {t("transfers.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
