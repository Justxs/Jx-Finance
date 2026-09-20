import { Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getTransfersQueryKey,
  useCreateTransfer,
  useDeleteTransfer,
  useTransfersSuspense,
} from "@/api/generated";
import type {
  AccountResponse,
  PagedResponseOfTransferResponse,
  TransferResponse,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { RowTransition } from "@/components/row-transition";
import { Button } from "@/components/ui/button";
import { Rows } from "@/components/ui/rows";
import { Section, SectionTitle } from "@/components/ui/section";
import { StaleRegion } from "@/components/ui/stale-region";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { optimisticPagedRemoval } from "@/lib/optimistic";
import { TRANSFERS_PAGE_SIZE as pageSize, transfersPageParams } from "../account-queries";
import { TransferEditDialog } from "./transfer-edit-dialog";
import { TransferForm } from "./transfer-form";

interface Props {
  accounts: AccountResponse[];
}

export function TransfersSection({ accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [addOpen, setAddOpen] = useState(false);

  const [page, setPage] = useState(1);
  const shownPage = useDeferredValue(page);
  const stale = shownPage !== page;
  const listParams = transfersPageParams(shownPage);
  const transfers = useTransfersSuspense(listParams);
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
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteTransfer({
    mutation: optimisticPagedRemoval<PagedResponseOfTransferResponse>(
      getTransfersQueryKey(listParams),
      getTransfersQueryKey(),
    ),
  });

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
      <Rows>
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
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-2 font-semibold whitespace-nowrap tabular-nums">
                  {transferAmount(transfer)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setEditTarget(transfer.id)}
                  aria-label={`${t("actions.edit")}: ${transferRoute(transfer)}, ${formatDate(transfer.date)}`}
                  tooltip={`${t("actions.edit")}: ${transferRoute(transfer)}, ${formatDate(transfer.date)}`}
                >
                  <Pencil />
                </Button>
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
      </Rows>
    );
  }

  return (
    <Section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>{t("transfers.heading")}</SectionTitle>
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
          onSubmit={(values) => createMutation.mutateAsync({ data: values })}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
      <StaleRegion stale={stale}>{content}</StaleRegion>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <TransferEditDialog
        accounts={accounts}
        transfer={items.find((transfer) => transfer.id === editTarget) ?? null}
        onClose={() => setEditTarget(null)}
      />
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={deleteLabel}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </Section>
  );
}
