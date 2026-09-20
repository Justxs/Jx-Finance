import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useConfirmRecurringBill } from "@/api/generated";
import type { AccountResponse, RecurringBillResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { hasServerErrorCode } from "@/lib/form-server-errors";
import { silent } from "@/lib/mutations";
import { namedOptions } from "@/lib/options";
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

  const confirmMutation = useConfirmRecurringBill(silent({ onSuccess: onDone }));

  const form = useServerForm({
    defaultValues: { amount: "", accountId: "" },
    schema,
    submit: (value) =>
      confirmMutation.mutateAsync({
        id: bill.id,
        data: {
          expectedDueDate: bill.nextDueDate,
          amount: isVariable ? value.amount : null,
          accountId: needsAccount ? value.accountId : null,
        },
      }),
  });

  const stale = hasServerErrorCode(confirmMutation.error, "conflict.stale");

  return (
    <form.AppForm>
      <form.FormShell className="grid items-start gap-4 *:min-w-0">
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
                options={namedOptions(accounts)}
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

        <form.FormActions
          pending={confirmMutation.isPending}
          submitLabel={t("recurringBills.confirm")}
          onCancel={onDone}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
