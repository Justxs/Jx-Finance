import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateRecurringBillEndpoint } from "@/api/generated";
import type { RecurringBillResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPositiveMoney } from "@/lib/validation";

interface Props {
  bill: RecurringBillResponse;
  onSaved: () => void;
  onDone: () => void;
}

export function RecurringBillEditForm({ bill, onSaved, onDone }: Readonly<Props>) {
  const { t } = useTranslation();

  const [name, setName] = useState(bill.name ?? "");
  const [amount, setAmount] = useState(bill.amount ?? "");
  const [remindDaysBefore, setRemindDaysBefore] = useState(String(bill.remindDaysBefore ?? 0));
  const [isActive, setIsActive] = useState(bill.isActive ?? true);

  const updateMutation = useUpdateRecurringBillEndpoint({
    mutation: { onSuccess: onDone, onSettled: onSaved },
  });

  const amountInvalid = bill.kind === "fixed" && !isPositiveMoney(amount);

  return (
    <div className="form-grid rounded-md border bg-muted/30 p-4">
      <div className="space-y-1.5">
        <Label htmlFor={`bill-${bill.id}-name`}>{t("recurringBills.name")}</Label>
        <Input id={`bill-${bill.id}-name`} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {bill.kind === "fixed" ? (
        <div className="space-y-1.5">
          <Label htmlFor={`bill-${bill.id}-amount`}>{t("recurringBills.amount")}</Label>
          <Input
            id={`bill-${bill.id}-amount`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor={`bill-${bill.id}-remind`}>{t("recurringBills.remindDaysBefore")}</Label>
        <Input
          id={`bill-${bill.id}-remind`}
          type="number"
          min={0}
          value={remindDaysBefore}
          onChange={(e) => setRemindDaysBefore(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="size-4 rounded border-input accent-primary"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        {t("recurringBills.active")}
      </label>
      <Button
        size="sm"
        pending={updateMutation.isPending}
        disabled={amountInvalid}
        onClick={() =>
          updateMutation.mutate({
            id: bill.id!,
            data: {
              name: name.trim(),
              kind: bill.kind!,
              amount: bill.kind === "fixed" ? amount : null,
              categoryId: bill.categoryId ?? null,
              accountId: bill.accountId ?? null,
              cadence: bill.cadence!,
              nextDueDate: bill.nextDueDate!,
              remindDaysBefore: Number(remindDaysBefore),
              isActive,
            },
          })
        }
      >
        {t("actions.save")}
      </Button>
    </div>
  );
}
