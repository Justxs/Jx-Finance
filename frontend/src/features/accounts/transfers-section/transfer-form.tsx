import { useTranslation } from "react-i18next";
import { z } from "zod";
import { type AccountResponse, Currency } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { useFeature, useToday } from "@/hooks/use-settings";
import { submitToServer } from "@/lib/form-server-errors";
import { isPositiveMoney, positiveMoney, requiredValue } from "@/lib/validation";
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
  onSubmit: (values: TransferFormValues) => Promise<unknown> | void;
  onCancel?: () => void;
}

function buildValues(value: FormValues): TransferFormValues {
  return {
    fromAccountId: value.fromAccountId,
    toAccountId: value.toAccountId,
    amount: value.amount,
    currency: value.currency,
    receivedAmount: value.currency === value.receivedCurrency ? null : value.receivedAmount,
    receivedCurrency: value.receivedCurrency,
    date: value.date,
    description: value.description.trim() || null,
  };
}

export function TransferForm({ accounts, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const multiCurrency = useFeature("multiCurrency");

  const schema = z
    .object({
      fromAccountId: requiredValue(t),
      toAccountId: requiredValue(t),
      amount: positiveMoney(t),
      currency: z.enum(Currency),
      receivedAmount: z.string(),
      receivedCurrency: z.enum(Currency),
      date: requiredValue(t),
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
        <form.Field name="fromAccountId">
          {(field) => (
            <field.SelectFieldControl
              id="transfer-from"
              label={t("transfers.from")}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              onValueChange={(value) => form.setFieldValue("currency", currencyOf(value))}
            />
          )}
        </form.Field>

        <form.Field name="toAccountId">
          {(field) => (
            <field.SelectFieldControl
              id="transfer-to"
              label={t("transfers.to")}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              onValueChange={(value) => form.setFieldValue("receivedCurrency", currencyOf(value))}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.fromAccountId}>
          {(fromAccountId) => (
            <form.Field name="currency">
              {(currencyField) => (
                <form.Field name="amount">
                  {(field) => (
                    <field.MoneyAmountField
                      id="transfer-amount"
                      label={t("transactions.amount")}
                      currencyLabel={t("transfers.sentCurrency")}
                      currencyField={currencyField}
                      preferred={heldBy(fromAccountId)}
                    />
                  )}
                </form.Field>
              )}
            </form.Field>
          )}
        </form.Subscribe>

        <form.Subscribe
          selector={(state) =>
            [
              state.values.currency,
              state.values.receivedCurrency,
              state.values.toAccountId,
            ] as const
          }
        >
          {([currency, receivedCurrency, toAccountId]) =>
            multiCurrency || currency !== receivedCurrency ? (
              <form.Field name="receivedCurrency">
                {(currencyField) => (
                  <form.Field name="receivedAmount">
                    {(field) => (
                      <field.MoneyAmountField
                        id="transfer-received"
                        label={t("transfers.received")}
                        currencyLabel={t("transfers.receivedCurrency")}
                        currencyField={currencyField}
                        placeholder={
                          currency === receivedCurrency ? t("transfers.sameAsSent") : "0.00"
                        }
                        disabled={currency === receivedCurrency}
                        blankWhenDisabled
                        touchedOnly
                        preferred={heldBy(toAccountId)}
                      />
                    )}
                  </form.Field>
                )}
              </form.Field>
            ) : null
          }
        </form.Subscribe>

        <form.Field name="date">
          {(field) => <field.DateField id="transfer-date" label={t("transactions.date")} />}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <field.TextField
              id="transfer-description"
              label={t("transactions.description")}
              className="col-span-full"
            />
          )}
        </form.Field>

        <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("actions.cancel")}
            </Button>
          ) : null}
          <form.SubmitButton pending={pending}>{t("transfers.add")}</form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
