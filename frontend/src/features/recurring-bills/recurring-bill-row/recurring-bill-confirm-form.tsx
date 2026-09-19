import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmRecurringBillEndpoint } from "@/api/generated";
import type { AccountResponse, RecurringBillResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPositiveMoney } from "@/lib/validation";

interface Props {
  bill: RecurringBillResponse;
  accounts: AccountResponse[];
  onSaved: () => void;
  onDone: () => void;
}

export function RecurringBillConfirmForm({ bill, accounts, onSaved, onDone }: Readonly<Props>) {
  const { t } = useTranslation();

  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(bill.accountId ?? "");

  const confirmMutation = useConfirmRecurringBillEndpoint({
    mutation: { onSuccess: onDone, onSettled: onSaved },
  });

  const isVariable = bill.kind === "variable";
  const amountRequired = isVariable && !isPositiveMoney(amount);
  const accountRequired = !bill.accountId && !accountId;

  return (
    <div className="form-grid rounded-md border bg-muted/30 p-4">
      <p className="col-span-full text-sm text-muted-foreground">
        {t("recurringBills.confirmTitle")}
      </p>
      {isVariable ? (
        <div className="space-y-1.5">
          <Label htmlFor={`bill-${bill.id}-confirm-amount`}>{t("recurringBills.amount")}</Label>
          <Input
            id={`bill-${bill.id}-confirm-amount`}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      ) : null}
      {bill.accountId ? null : (
        <div className="space-y-1.5">
          <Label htmlFor={`bill-${bill.id}-confirm-account`}>{t("recurringBills.account")}</Label>
          <SelectField
            id={`bill-${bill.id}-confirm-account`}
            value={accountId}
            onChange={setAccountId}
            options={[
              { value: "", label: t("recurringBills.noAccount") },
              ...accounts.map((account) => ({ value: account.id, label: account.name })),
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {t("recurringBills.confirmAccountRequired")}
          </p>
        </div>
      )}
      <Button
        size="sm"
        pending={confirmMutation.isPending}
        disabled={amountRequired || accountRequired}
        onClick={() =>
          confirmMutation.mutate({
            id: bill.id,
            data: {
              expectedDueDate: bill.nextDueDate,
              amount: isVariable ? amount : null,
              accountId: bill.accountId ? null : accountId,
            },
          })
        }
      >
        {t("recurringBills.confirm")}
      </Button>
    </div>
  );
}
