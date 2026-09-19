import { Plus, Trash2 } from "lucide-react";
import { type ReactNode, useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCreateTransfer, useDeleteTransfer, useGetTransfersSuspense } from "@/api/generated";
import type { AccountResponse, TransferResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { RowTransition } from "@/components/row-transition";
import { Button } from "@/components/ui/button";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { TransferForm } from "./transfer-form";

interface Props {
  accounts: AccountResponse[];
}

const pageSize = 10;

export function TransfersSection({ accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [addOpen, setAddOpen] = useState(false);

  const [page, setPage] = useState(1);
  const shownPage = useDeferredValue(page);
  const stale = shownPage !== page;
  const transfers = useGetTransfersSuspense({ page: shownPage, pageSize });
  const pages = Math.max(1, Math.ceil((transfers.data?.total ?? 0) / pageSize));
  if (page > pages) {
    setPage(pages);
  }
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

  const createMutation = useCreateTransfer({
    mutation: {
      onSuccess: () => setAddOpen(false),
    },
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteTransfer();

  const items = useDeferredValue(transfers.data?.items) ?? [];

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  function transferRoute(transfer: TransferResponse) {
    return `${accountNames.get(transfer.fromAccountId) ?? ""} → ${accountNames.get(transfer.toAccountId) ?? ""}`;
  }

  function transferAmount(transfer: TransferResponse) {
    const sent = money.format(Number(transfer.amount), transfer.currency);
    if (transfer.currency === transfer.receivedCurrency) {
      return sent;
    }

    return `${sent} → ${money.format(Number(transfer.receivedAmount), transfer.receivedCurrency)}`;
  }

  const deleteItem = items.find((transfer) => transfer.id === deleteTarget);
  const deleteLabel = deleteItem
    ? `${transferRoute(deleteItem)} · ${transferAmount(deleteItem)}`
    : undefined;

  let content: ReactNode;
  if (items.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{t("transfers.empty")}</p>;
  } else {
    content = (
      <ul className="rows">
        {items.map((transfer) => (
          <RowTransition key={transfer.id}>
            <li className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 break-words">
                <p className="text-sm font-medium">{transferRoute(transfer)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(transfer.date)}
                  {transfer.description ? ` · ${transfer.description}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold whitespace-nowrap tabular-nums">
                  {transferAmount(transfer)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  pending={deletingId === transfer.id}
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleteTarget(transfer.id)}
                  aria-label={`${t("actions.delete")}: ${transferRoute(transfer)}, ${formatDate(transfer.date)}`}
                  tooltip={`${t("actions.delete")}: ${transferRoute(transfer)}, ${formatDate(transfer.date)}`}
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
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">{t("transfers.heading")}</h2>
        <Button
          variant="outline"
          disabled={accounts.length < 2}
          size="sm"
          onClick={() => setAddOpen(true)}
        >
          <Plus />
          {t("transfers.add")}
        </Button>
      </div>
      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("transfers.title")}>
        <TransferForm
          accounts={accounts}
          pending={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate({ data: values })}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
      <div className={stale ? "is-stale" : undefined} aria-busy={stale}>
        {content}
      </div>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={deleteLabel}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </section>
  );
}
