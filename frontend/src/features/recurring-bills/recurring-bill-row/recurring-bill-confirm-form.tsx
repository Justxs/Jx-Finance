import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useConfirmRecurringBill } from "@/api/generated";
import type { AccountResponse, RecurringBillResponse } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { hasServerErrorCode, submitToServer } from "@/lib/form-server-errors";
import { positiveMoney, requiredValue } from "@/lib/validation";

interface Props {
  bill: RecurringBillResponse;
  accounts: AccountResponse[];
  onDone: () => void;
}

export function RecurringBillConfirmForm({ bill, accounts, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const money = useMoney();
  const fieldId = `bill-${bill.id}-confirm`;
  const isVariable = bill.kind === "variable";
  const needsAccount = !bill.accountId;

  const schema = z.object({
    amount: isVariable ? positiveMoney(t) : z.string(),
    accountId: needsAccount ? requiredValue(t) : z.string(),
  });

  const confirmMutation = useConfirmRecurringBill({
    mutation: { meta: { silent: true }, onSuccess: onDone },
  });

  const form = useAppForm({
    defaultValues: { amount: "", accountId: "" },
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        confirmMutation.mutateAsync({
          id: bill.id,
          data: {
            expectedDueDate: bill.nextDueDate,
            amount: isVariable ? value.amount : null,
            accountId: needsAccount ? value.accountId : null,
          },
        }),
      );
    },
  });

  const stale = hasServerErrorCode(confirmMutation.error, "conflict.stale");

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        className="grid items-start gap-4 *:min-w-0"
      >
        <p className="text-sm text-muted-foreground">
          {bill.amount
            ? t("recurringBills.confirmFixed", {
                name: bill.name,
                date: formatDate(bill.nextDueDate),
                amount: money.format(Number(bill.amount)),
              })
            : t("recurringBills.confirmVariable", {
                name: bill.name,
                date: formatDate(bill.nextDueDate),
              })}
        </p>

        {isVariable ? (
          <form.Field name="amount">
            {(field) => (
              <field.MoneyInputField
                id={`${fieldId}-amount`}
                label={t("recurringBills.amount")}
                touchedOnly
                autoFocus
              />
            )}
          </form.Field>
        ) : null}

        {needsAccount ? (
          <form.Field name="accountId">
            {(field) => (
              <field.SelectFieldControl
                id={`${fieldId}-account`}
                label={t("recurringBills.account")}
                hint={t("recurringBills.confirmAccountRequired")}
                placeholder={t("recurringBills.chooseAccount")}
                touchedOnly
                options={accounts.map((account) => ({ value: account.id, label: account.name }))}
              />
            )}
          </form.Field>
        ) : null}

        {stale ? (
          <p role="alert" className="border-t border-expense pt-2 text-sm text-expense">
            {t("recurringBills.confirmStale")}
          </p>
        ) : (
          <FormError error={confirmMutation.error} />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onDone}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={confirmMutation.isPending}>
            {t("recurringBills.confirm")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
