import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getTransfersQueryKey, useDeleteTransfer, useTransfersSuspense } from "@/api/generated";
import type {
  AccountResponse,
  PagedResponseOfTransferResponse,
  TransferResponse,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { EditModal, Modal } from "@/components/modal";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { RecordRow } from "@/components/record-row/record-row";
import { Button } from "@/components/ui/button/button";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";
import { optimisticPagedRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { TRANSFERS_PAGE_SIZE as pageSize, transfersPageParams } from "../account-queries";
import { TransferForm } from "./transfer-form";

interface Props {
  accounts: AccountResponse[];
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}

export function TransfersSection({ accounts, addOpen, onAddOpenChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();

  const paging = usePagedList();
  const listParams = transfersPageParams(paging.shownPage);
  const transfers = useTransfersSuspense(listParams);
  const { items, pages } = usePagedItems(paging, transfers.data, pageSize);
  const accountNames = nameById(accounts);

  const [editTarget, setEditTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteTransfer({
    mutation: optimisticPagedRemoval<PagedResponseOfTransferResponse>(
      getTransfersQueryKey(listParams),
      getTransfersQueryKey(),
    ),
  });

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

  const remove = useConfirmedDelete(
    deleteMutation,
    items,
    (transfer) => `${transferRoute(transfer)} · ${transferAmount(transfer)}`,
    "transfer",
  );

  const content = (
    <PagedRows paging={paging} pages={pages} count={items.length} emptyText={t("transfers.empty")}>
      {items.map((transfer) => (
        <RecordRow
          key={transfer.id}
          title={transferRoute(transfer)}
          subtitle={`${formatDate(transfer.date)}${transfer.description ? ` · ${transfer.description}` : ""}`}
          amount={transferAmount(transfer)}
          label={`${transferRoute(transfer)}, ${formatDate(transfer.date)}`}
          onEdit={() => setEditTarget(transfer.id)}
          {...remove.deleteProps(transfer.id)}
        />
      ))}
    </PagedRows>
  );

  return (
    <Section>
      <SectionHeader title={t("transfers.heading")}>
        <Button
          variant="outline"
          disabled={accounts.length < 2}
          size="sm"
          onClick={() => onAddOpenChange(true)}
        >
          <Plus />
          {t("transfers.add")}
        </Button>
      </SectionHeader>
      <Modal open={addOpen} onOpenChange={onAddOpenChange} title={t("transfers.title")}>
        <TransferForm accounts={accounts} onClose={() => onAddOpenChange(false)} />
      </Modal>
      {content}
      <EditModal
        item={items.find((transfer) => transfer.id === editTarget) ?? null}
        title={t("transfers.editTitle")}
        onClose={() => setEditTarget(null)}
      >
        {(transfer, close) => (
          <TransferForm accounts={accounts} transfer={transfer} onClose={close} />
        )}
      </EditModal>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
