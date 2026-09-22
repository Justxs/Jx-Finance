import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  RecurringBillResponse,
  RecurringBillShape,
} from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { RowActions } from "@/components/row-actions/row-actions";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { cn, metaLine } from "@/lib/utils";
import { BillRowLayout } from "../bill-row-layout";
import { RecurringBillForm } from "../recurring-bill-form/recurring-bill-form";
import { RecurringBillConfirmForm } from "./recurring-bill-confirm-form";

const shapeTone = {
  expense: "negative",
  income: "positive",
  transfer: "accent",
} as const satisfies Record<RecurringBillShape, "negative" | "positive" | "accent">;

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
  const toAccount = accounts.find((a) => a.id === bill.toAccountId);

  const today = useToday();
  const overdue = bill.isActive && Boolean(bill.nextDueDate) && bill.nextDueDate < today;
  const isTransfer = bill.shape === "transfer";

  const meta = metaLine(
    t(`recurringBills.cadences.${bill.cadence}`),
    bill.amount ? t(`recurringBills.kinds.${bill.kind}`) : null,
    category?.name,
    isTransfer && account && toAccount ? `${account.name} → ${toAccount.name}` : account?.name,
  );

  return (
    <BillRowLayout
      heading={
        <>
          <p
            className={cn(
              "min-w-0 font-medium wrap-break-word",
              !bill.isActive && "text-muted-foreground",
            )}
          >
            {bill.name}
          </p>
          <Tag tone={shapeTone[bill.shape]}>{t(`recurringBills.shapes.${bill.shape}`)}</Tag>
          {bill.isActive ? null : <Tag tone="neutral">{t("recurringBills.inactive")}</Tag>}
          {overdue ? <Tag tone="negative">{t("recurringBills.overdue")}</Tag> : null}
        </>
      }
      meta={
        <p className="text-xs wrap-break-word text-muted-foreground">
          <span className={cn("tabular-nums", bill.isActive && "text-foreground")}>
            {t("recurringBills.nextDueDate")}: {formatDate(bill.nextDueDate)}
          </span>
          {meta ? ` · ${meta}` : ""}
        </p>
      }
      amount={
        bill.amount ? (
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
        )
      }
      actions={
        <RowActions
          label={bill.name}
          size="icon"
          onEdit={() => setMode("edit")}
          onDelete={onDelete}
          deletePending={deletePending}
          deleteDisabled={deleteDisabled}
          className="gap-0"
        >
          <Button
            variant="outline"
            size="sm"
            className="mr-2"
            disabled={!bill.isActive}
            onClick={() => setMode("confirm")}
          >
            {t(`recurringBills.record.${bill.shape}`)}
          </Button>
        </RowActions>
      }
    >
      <Modal
        open={mode === "edit"}
        onClose={() => setMode("view")}
        title={t("recurringBills.editTitle")}
        description={bill.name}
      >
        <RecurringBillForm
          bill={bill}
          accounts={accounts}
          categories={categories}
          onDone={() => setMode("view")}
          onCancel={() => setMode("view")}
        />
      </Modal>

      <Modal
        open={mode === "confirm"}
        onClose={() => setMode("view")}
        title={t("recurringBills.confirmTitle")}
      >
        <RecurringBillConfirmForm bill={bill} accounts={accounts} onDone={() => setMode("view")} />
      </Modal>
    </BillRowLayout>
  );
}
