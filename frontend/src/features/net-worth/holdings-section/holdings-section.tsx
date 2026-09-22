import { Plus } from "lucide-react";
import { type ComponentType, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TrashKind } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { EditModal, Modal } from "@/components/modal";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useMoney } from "@/hooks/use-formatters";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import type { HoldingFormValues } from "./holding-form";

export interface HoldingItem<TValues = HoldingFormValues> {
  id: string;
  name: string;
  details: string;
  amount: number;
  values: TValues;
  action?: ReactNode;
}

export interface HoldingFormProps<TValues = HoldingFormValues> {
  editing?: { id: string; values: TValues };
  onCreated: () => void;
  onCancel: () => void;
}

interface Props<TValues> {
  title: string;
  addLabel: string;
  emptyLabel: string;
  tone?: "neutral" | "expense";
  items: readonly HoldingItem<TValues>[];
  deletingId?: string | null;
  deleteDisabled: boolean;
  onDelete: (id: string, options?: { onSuccess?: () => void }) => void;
  undoKind: TrashKind;
  form: ComponentType<HoldingFormProps<TValues>>;
}

export function HoldingsSection<TValues = HoldingFormValues>({
  title,
  addLabel,
  emptyLabel,
  tone = "neutral",
  items,
  deletingId,
  deleteDisabled,
  onDelete,
  undoKind,
  form: Form,
}: Readonly<Props<TValues>>) {
  const { t } = useTranslation();
  const money = useMoney();
  const [addOpen, setAddOpen] = useState(false);
  const remove = useConfirmedDelete(
    {
      mutate: ({ id }, options) => onDelete(id, options),
      isPending: deleteDisabled,
      variables: deletingId ? { id: deletingId } : undefined,
    },
    items,
    (item) => item.name,
    undoKind,
  );
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
                onDelete={() => remove.request(item.id)}
                deletePending={remove.pendingId === item.id}
                deleteDisabled={remove.busy}
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
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          {addLabel}
        </Button>
      </div>
      <Modal open={addOpen} onOpenChange={setAddOpen} title={addLabel}>
        <Form onCreated={() => setAddOpen(false)} onCancel={() => setAddOpen(false)} />
      </Modal>
      <EditModal
        item={editItem ?? null}
        title={(item) => `${t("actions.edit")}: ${item.name}`}
        onClose={() => setEditTarget(null)}
      >
        {(item) => (
          <Form
            editing={{ id: item.id, values: item.values }}
            onCreated={() => setEditTarget(null)}
            onCancel={() => setEditTarget(null)}
          />
        )}
      </EditModal>
      {content}
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
