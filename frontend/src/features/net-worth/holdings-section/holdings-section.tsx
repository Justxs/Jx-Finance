import { type ComponentType, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TrashKind } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EditModal } from "@/components/modal";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { type DeleteMutation, useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useMoney } from "@/hooks/use-formatters";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
export interface HoldingItem<TValues> {
  id: string;
  name: string;
  details: string;
  amount: number;
  values: TValues;
  action?: ReactNode;
}

export interface HoldingFormProps<TValues> {
  editing?: { id: string; values: TValues };
  onClose: () => void;
}

interface Props<TValues> {
  title: string;
  addLabel: string;
  emptyLabel: string;
  tone?: "neutral" | "expense";
  items: readonly HoldingItem<TValues>[];
  deleteMutation: DeleteMutation;
  undoKind: TrashKind;
  form: ComponentType<HoldingFormProps<TValues>>;
}

export function HoldingsSection<TValues>({
  title,
  addLabel,
  emptyLabel,
  tone = "neutral",
  items,
  deleteMutation,
  undoKind,
  form: Form,
}: Readonly<Props<TValues>>) {
  const { t } = useTranslation();
  const money = useMoney();
  const remove = useConfirmedDelete(deleteMutation, items, (item) => item.name, undoKind);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const editItem = items.find((item) => item.id === editTarget);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const amountClass = cn(
    "font-semibold whitespace-nowrap tabular-nums",
    tone === "expense" && EXPENSE_TONE,
  );

  let content: ReactNode;
  if (items.length === 0) {
    content = <EmptyText>{emptyLabel}</EmptyText>;
  } else {
    content = (
      <Rows>
        {items.map((item) => (
          <RowTransition key={item.id}>
            <li className="flex items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1 wrap-break-word">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{item.details}</p>
              </div>
              <RowActions
                label={item.name}
                size="icon"
                onEdit={() => setEditTarget(item.id)}
                {...remove.deleteProps(item.id)}
              >
                <span className={cn("text-right", amountClass)}>{money.format(item.amount)}</span>
                {item.action}
              </RowActions>
            </li>
          </RowTransition>
        ))}
      </Rows>
    );
  }

  return (
    <Section>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SectionTitle className="min-w-0 flex-1">{title}</SectionTitle>
        {items.length > 0 ? <span className={amountClass}>{money.format(total)}</span> : null}
        <CreateDialog label={addLabel} title={addLabel} secondary>
          {(close) => <Form onClose={close} />}
        </CreateDialog>
      </div>
      <EditModal
        item={editItem ?? null}
        title={(item) => `${t("actions.edit")}: ${item.name}`}
        onClose={() => setEditTarget(null)}
      >
        {(item, close) => <Form editing={{ id: item.id, values: item.values }} onClose={close} />}
      </EditModal>
      {content}
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
