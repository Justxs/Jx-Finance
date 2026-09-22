import { useTranslation } from "react-i18next";
import { z } from "zod";
import { type AccountResponse, Currency, type TransferResponse } from "@/api/generated/model";
import { MoneyPairField, useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useFeature, useToday } from "@/hooks/use-settings";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { namedOptions, withMissingOption } from "@/lib/options";
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
  transfer?: TransferResponse;
  error?: unknown;
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

function valuesOf(transfer: TransferResponse): FormValues {
  return {
    fromAccountId: transfer.fromAccountId,
    toAccountId: transfer.toAccountId,
    amount: transfer.amount,
    currency: transfer.currency,
    receivedAmount: transfer.currency === transfer.receivedCurrency ? "" : transfer.receivedAmount,
    receivedCurrency: transfer.receivedCurrency,
    date: transfer.date,
    description: transfer.description ?? "",
  };
}

export function TransferForm({
  accounts,
  transfer,
  error,
  pending,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const multiCurrency = useFeature("multiCurrency");
  const fromLocked = transfer?.fromAccountImported === true;
  const toLocked = transfer?.toAccountImported === true;
  const anyLocked = fromLocked || toLocked;
  const lockedHint = t("transfers.lockedHint");

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
    return accounts.find((account) => account.id === accountId)?.currency ?? DEFAULT_CURRENCY;
  }

  function heldBy(accountId: string) {
    return heldCurrencies(accounts.find((account) => account.id === accountId));
  }

  function accountOptions(selectedId: string | undefined) {
    return withMissingOption(namedOptions(accounts), selectedId, t("transfers.unavailableAccount"));
  }

  function lockedNote() {
    if (fromLocked && toLocked) {
      return t("transfers.lockedBoth");
    }
    const lockedId = fromLocked ? transfer?.fromAccountId : transfer?.toAccountId;
    const account = accounts.find((item) => item.id === lockedId)?.name ?? "";
    return t("transfers.lockedOne", { account });
  }

  const defaultValues: FormValues = transfer
    ? valuesOf(transfer)
    : {
        fromAccountId: accounts[0]?.id ?? "",
        toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
        amount: "",
        currency: accounts[0]?.currency ?? DEFAULT_CURRENCY,
        receivedAmount: "",
        receivedCurrency: (accounts[1] ?? accounts[0])?.currency ?? DEFAULT_CURRENCY,
        date: today,
        description: "",
      };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => onSubmit(buildValues(value)),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        {anyLocked ? (
          <p className="col-span-full text-sm text-muted-foreground">{lockedNote()}</p>
        ) : null}

        <form.Field name="fromAccountId">
          {(field) => (
            <field.SelectFieldControl
              id="transfer-from"
              label={t("transfers.from")}
              hint={fromLocked ? lockedHint : undefined}
              disabled={fromLocked}
              options={accountOptions(transfer?.fromAccountId)}
              onValueChange={(value) => form.setFieldValue("currency", currencyOf(value))}
            />
          )}
        </form.Field>

        <form.Field name="toAccountId">
          {(field) => (
            <field.SelectFieldControl
              id="transfer-to"
              label={t("transfers.to")}
              hint={toLocked ? lockedHint : undefined}
              disabled={toLocked}
              options={accountOptions(transfer?.toAccountId)}
              onValueChange={(value) => form.setFieldValue("receivedCurrency", currencyOf(value))}
            />
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) =>
            [
              state.values.fromAccountId,
              state.values.currency === state.values.receivedCurrency,
            ] as const
          }
        >
          {([fromAccountId, sameCurrency]) => {
            const amountLocked = fromLocked || (toLocked && sameCurrency);
            return (
              <MoneyPairField
                form={form}
                fields={{ amount: "amount", currency: "currency" }}
                id="transfer-amount"
                label={t("transactions.amount")}
                currencyLabel={t("transfers.sentCurrency")}
                hint={amountLocked ? lockedHint : undefined}
                disabled={amountLocked}
                preferred={heldBy(fromAccountId)}
              />
            );
          }}
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
              <MoneyPairField
                form={form}
                fields={{ amount: "receivedAmount", currency: "receivedCurrency" }}
                id="transfer-received"
                label={t("transfers.received")}
                currencyLabel={t("transfers.receivedCurrency")}
                placeholder={currency === receivedCurrency ? t("transfers.sameAsSent") : "0.00"}
                hint={toLocked && currency !== receivedCurrency ? lockedHint : undefined}
                disabled={toLocked || currency === receivedCurrency}
                blankWhenDisabled={currency === receivedCurrency}
                touchedOnly
                preferred={heldBy(toAccountId)}
              />
            ) : null
          }
        </form.Subscribe>

        <form.Field name="date">
          {(field) => (
            <field.DateField
              id="transfer-date"
              label={t("transactions.date")}
              hint={anyLocked ? lockedHint : undefined}
              disabled={anyLocked}
            />
          )}
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

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={transfer ? t("actions.save") : t("transfers.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
