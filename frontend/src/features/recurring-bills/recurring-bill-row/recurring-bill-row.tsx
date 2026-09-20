import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  RecurringBillResponse,
} from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { RowTransition } from "@/components/row-transition";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
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
}

export function RecurringBillRow({
  bill,
  accounts,
  categories,
  onDelete,
  deletePending,
  deleteDisabled,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [mode, setMode] = useState<"view" | "edit" | "confirm">("view");

  const category = categories.find((c) => c.id === bill.categoryId);
  const account = accounts.find((a) => a.id === bill.accountId);

  const today = useToday();
  const overdue = bill.isActive && Boolean(bill.nextDueDate) && bill.nextDueDate < today;

  const meta = [
    t(`recurringBills.cadences.${bill.cadence}`),
    bill.amount ? t(`recurringBills.kinds.${bill.kind}`) : null,
    category?.name,
    account?.name,
  ].filter(Boolean);

  return (
    <RowTransition>
      <li className="py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p
                className={cn(
                  "min-w-0 font-medium wrap-break-word",
                  !bill.isActive && "text-muted-foreground",
                )}
              >
                {bill.name}
              </p>
              {bill.isActive ? null : <Tag tone="neutral">{t("recurringBills.inactive")}</Tag>}
              {overdue ? <Tag tone="negative">{t("recurringBills.overdue")}</Tag> : null}
            </div>
            <p className="text-xs wrap-break-word text-muted-foreground">
              <span className={cn("tabular-nums", bill.isActive && "text-foreground")}>
                {t("recurringBills.nextDueDate")}: {formatDate(bill.nextDueDate)}
              </span>
              {meta.length > 0 ? ` · ${meta.join(" · ")}` : ""}
            </p>
          </div>
          {bill.amount ? (
            <span
              className={cn(
                "text-right text-sm font-semibold whitespace-nowrap tabular-nums",
                !bill.isActive && "text-muted-foreground",
              )}
            >
              {money.format(Number(bill.amount))}
            </span>
          ) : (
            <span className="text-right text-sm text-muted-foreground">
              {t("recurringBills.kinds.variable")}
            </span>
          )}
          <div className="col-span-2 flex items-center justify-end sm:col-span-1">
            <Button
              variant="outline"
              size="sm"
              className="mr-2"
              disabled={!bill.isActive}
              onClick={() => setMode("confirm")}
            >
              {t("recurringBills.recordPayment")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode("edit")}
              aria-label={`${t("actions.edit")}: ${bill.name}`}
              tooltip={`${t("actions.edit")}: ${bill.name}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              pending={deletePending}
              disabled={deleteDisabled}
              onClick={onDelete}
              aria-label={`${t("actions.delete")}: ${bill.name}`}
              tooltip={`${t("actions.delete")}: ${bill.name}`}
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        <Modal
          open={mode === "edit"}
          onOpenChange={(open) => {
            if (!open) {
              setMode("view");
            }
          }}
          title={t("recurringBills.editTitle")}
          description={bill.name}
        >
          <RecurringBillEditForm
            bill={bill}
            accounts={accounts}
            categories={categories}
            onDone={() => setMode("view")}
          />
        </Modal>

        <Modal
          open={mode === "confirm"}
          onOpenChange={(open) => {
            if (!open) {
              setMode("view");
            }
          }}
          title={t("recurringBills.confirmTitle")}
        >
          <RecurringBillConfirmForm
            bill={bill}
            accounts={accounts}
            onDone={() => setMode("view")}
          />
        </Modal>
      </li>
    </RowTransition>
  );
}
