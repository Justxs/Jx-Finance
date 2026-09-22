import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, TransactionResponse } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { useMoney } from "@/hooks/use-formatters";
import { useSettingsSuspense, useToday } from "@/hooks/use-settings";
import { submitToServer } from "@/lib/form-server-errors";
import { type TransactionDraft, draftFromTransaction } from "./transaction-draft";
import {
  type TransactionFormValues,
  defaultFormFields,
  toSubmittedValues,
  transactionSchema,
} from "./transaction-schema";

export type SubmitIntent = "save" | "another";

interface FormSource {
  accounts: AccountResponse[];
  initial?: TransactionResponse;
  prefill?: TransactionDraft;
  onSubmit: (values: TransactionFormValues) => Promise<unknown> | void;
  onSubmitAndAddAnother?: (values: TransactionFormValues) => Promise<boolean>;
  intent: RefObject<SubmitIntent>;
  amountInput: RefObject<HTMLInputElement | null>;
  onAnotherSettled: () => void;
}

export function useTransactionForm({
  accounts,
  initial,
  prefill,
  onSubmit,
  onSubmitAndAddAnother,
  intent,
  amountInput,
  onAnotherSettled,
}: Readonly<FormSource>) {
  const { t } = useTranslation();
  const money = useMoney();
  const today = useToday();
  const schema = transactionSchema(t, money.format);

  const { defaultAccountId } = useSettingsSuspense();
  const defaultAccount = accounts.find((account) => account.id === defaultAccountId) ?? accounts[0];
  const source: TransactionDraft = initial ? draftFromTransaction(initial) : (prefill ?? {});
  const defaultValues = defaultFormFields(source, defaultAccount, today);

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: async (submission) => {
      const { value, formApi } = submission;
      const values = toSubmittedValues(value);

      if (intent.current !== "another" || !onSubmitAndAddAnother) {
        return submitToServer(submission, () => onSubmit(values));
      }

      let saved = false;
      const fieldErrors = await submitToServer(submission, async () => {
        saved = await onSubmitAndAddAnother(values);
      });
      onAnotherSettled();
      if (saved) {
        formApi.reset({
          ...defaultValues,
          type: value.type,
          accountId: value.accountId,
          currency: value.currency,
          date: value.date,
        });
        amountInput.current?.focus();
      }

      return fieldErrors;
    },
  });

  return form;
}

export type TransactionFormApi = ReturnType<typeof useTransactionForm>;
