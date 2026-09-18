import { Plus, Trash2 } from "lucide-react";
import { type ComponentType, type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { RowTransition } from "@/components/row-transition";
import { Button } from "@/components/ui/button";
import { useMoney } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

export interface HoldingItem {
  id: string;
  name: string;
  details: string;
  amount: number;
}

export interface HoldingFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

interface Props {
  title: string;
  addLabel: string;
  emptyLabel: string;
  tone?: "neutral" | "expense";
  items: readonly HoldingItem[];
  deletingId?: string;
  deleteDisabled: boolean;
  onDelete: (id: string) => void;
  onCreated: () => void;
  form: ComponentType<HoldingFormProps>;
}

export function HoldingsSection({
  title,
  addLabel,
  emptyLabel,
  tone = "neutral",
  items,
  deletingId,
  deleteDisabled,
  onDelete,
  onCreated,
  form: Form,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const amountClass = cn(
    "font-semibold whitespace-nowrap tabular-nums",
    tone === "expense" && "text-expense",
  );

  let content: ReactNode;
  if (items.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{emptyLabel}</p>;
  } else {
    content = (
      <ul className="rows">
        {items.map((item) => (
          <RowTransition key={item.id}>
            <li className="flex items-center gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1 wrap-break-word">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{item.details}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className={cn("text-right", amountClass)}>{money.format(item.amount)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  pending={deletingId === item.id}
                  disabled={deleteDisabled}
                  onClick={() => setDeleteTarget(item.id)}
                  aria-label={`${t("actions.delete")}: ${item.name}`}
                  tooltip={`${t("actions.delete")}: ${item.name}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          </RowTransition>
        ))}
      </ul>
    );
  }

  return (
    <section className="section">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="section-title min-w-0 flex-1">{title}</h2>
        {items.length > 0 ? <span className={amountClass}>{money.format(total)}</span> : null}
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          {addLabel}
        </Button>
      </div>
      <Modal open={addOpen} onOpenChange={setAddOpen} title={addLabel}>
        <Form
          onCreated={() => {
            onCreated();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
      {content}
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={items.find((item) => item.id === deleteTarget)?.name}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />
    </section>
  );
}
