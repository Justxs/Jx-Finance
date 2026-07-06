import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfirmRecurringBillEndpoint } from "@/api/generated";
import type { AccountResponse, RecurringBillResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
    <div className="grid gap-3 rounded-md border bg-muted/30 p-4 md:grid-cols-4 md:items-end">
      <p className="text-sm text-muted-foreground md:col-span-4">
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
      {!bill.accountId ? (
        <div className="space-y-1.5">
          <Label htmlFor={`bill-${bill.id}-confirm-account`}>{t("recurringBills.account")}</Label>
          <Select
            id={`bill-${bill.id}-confirm-account`}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">{t("recurringBills.noAccount")}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("recurringBills.confirmAccountRequired")}
          </p>
        </div>
      ) : null}
      <Button
        size="sm"
        disabled={confirmMutation.isPending || amountRequired || accountRequired}
        onClick={() =>
          confirmMutation.mutate({
            id: bill.id!,
            data: {
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
