import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  RecurringBillResponse,
} from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";
import { RecurringBillConfirmForm } from "./recurring-bill-confirm-form";
import { RecurringBillEditForm } from "./recurring-bill-edit-form";

interface Props {
  bill: RecurringBillResponse;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onDelete: () => void;
  deletePending: boolean;
  deleteDisabled: boolean;
  onSaved: () => void;
}

export function RecurringBillRow({
  bill,
  accounts,
  categories,
  onDelete,
  deletePending,
  deleteDisabled,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const date = useDate();
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");

  const category = categories.find((c) => c.id === bill.categoryId);
  const account = accounts.find((a) => a.id === bill.accountId);

  return (
    <li className="space-y-3 px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{bill.name}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                bill.isActive
                  ? "bg-secondary/60 text-secondary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {bill.isActive ? t("recurringBills.active") : t("recurringBills.inactive")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(`recurringBills.kinds.${bill.kind}`)} ·{" "}
            {t(`recurringBills.cadences.${bill.cadence}`)} · {t("recurringBills.nextDueDate")}:{" "}
            {date.format(new Date(bill.nextDueDate!))}
            {category ? ` · ${category.name}` : ""}
            {account ? ` · ${account.name}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
            {bill.amount ? money.format(Number(bill.amount)) : t("recurringBills.kinds.variable")}
          </span>
          <Button size="sm" disabled={!bill.isActive} onClick={() => setMode("confirm")}>
            {t("recurringBills.confirm")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setMode("edit")}
            aria-label={t("actions.edit")}
            title={t("actions.edit")}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            pending={deletePending}
            disabled={deleteDisabled}
            onClick={onDelete}
            aria-label={t("actions.delete")}
            title={t("actions.delete")}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <Dialog
        open={mode === "edit"}
        onOpenChange={(open) => {
          if (!open) {
            setMode("view");
          }
        }}
        title={t("actions.edit")}
      >
        <RecurringBillEditForm bill={bill} onSaved={onSaved} onDone={() => setMode("view")} />
      </Dialog>

      <Dialog
        open={mode === "confirm"}
        onOpenChange={(open) => {
          if (!open) {
            setMode("view");
          }
        }}
        title={t("recurringBills.confirm")}
      >
        <RecurringBillConfirmForm
          bill={bill}
          accounts={accounts}
          onSaved={onSaved}
          onDone={() => setMode("view")}
        />
      </Dialog>
    </li>
  );
}
