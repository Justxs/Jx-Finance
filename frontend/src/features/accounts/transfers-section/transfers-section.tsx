import { Plus } from "lucide-react";
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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination/pagination";
import { RecordRow } from "@/components/record-row/record-row";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { usePageClamp, usePagedList } from "@/hooks/use-paged-list";
import { silent } from "@/lib/mutations";
import { optimisticPagedRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { TRANSFERS_PAGE_SIZE as pageSize, transfersPageParams } from "../account-queries";
import { TransferEditDialog } from "./transfer-edit-dialog";
import { TransferForm } from "./transfer-form";

interface Props {
  accounts: AccountResponse[];
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
}

export function TransfersSection({ accounts, addOpen, onAddOpenChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [ownAddOpen, setOwnAddOpen] = useState(false);
  const createOpen = addOpen ?? ownAddOpen;

  function setAddOpen(open: boolean) {
    setOwnAddOpen(open);
    onAddOpenChange?.(open);
  }

  const paging = usePagedList();
  const { page, setPage, shownPage, stale } = paging;
  const listParams = transfersPageParams(shownPage);
  const transfers = useTransfersSuspense(listParams);
  const pages = usePageClamp(paging, transfers.data?.total ?? 0, pageSize);
  const accountNames = nameById(accounts);

  const createMutation = useCreateTransfer(silent({ onSuccess: () => setAddOpen(false) }));
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteTransfer({
    mutation: optimisticPagedRemoval<PagedResponseOfTransferResponse>(
      getTransfersQueryKey(listParams),
      getTransfersQueryKey(),
    ),
  });

  const items = useDeferredValue(transfers.data?.items) ?? [];

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

  let content: ReactNode;
  if (items.length === 0) {
    content = <EmptyText>{t("transfers.empty")}</EmptyText>;
  } else {
    content = (
      <Rows>
        {items.map((transfer) => (
          <RecordRow
            key={transfer.id}
            title={transferRoute(transfer)}
            subtitle={`${formatDate(transfer.date)}${transfer.description ? ` · ${transfer.description}` : ""}`}
            amount={transferAmount(transfer)}
            label={`${transferRoute(transfer)}, ${formatDate(transfer.date)}`}
            onEdit={() => setEditTarget(transfer.id)}
            onDelete={() => remove.request(transfer.id)}
            deletePending={remove.pendingId === transfer.id}
            deleteDisabled={remove.busy}
          />
        ))}
      </Rows>
    );
  }

  return (
    <Section>
      <SectionHeader title={t("transfers.heading")}>
        <Button
          variant="outline"
          disabled={accounts.length < 2}
          size="sm"
          onClick={() => {
            createMutation.reset();
            setAddOpen(true);
          }}
        >
          <Plus />
          {t("transfers.add")}
        </Button>
      </SectionHeader>
      <Modal open={createOpen} onOpenChange={setAddOpen} title={t("transfers.title")}>
        <TransferForm
          accounts={accounts}
          pending={createMutation.isPending}
          error={createMutation.error}
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
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
