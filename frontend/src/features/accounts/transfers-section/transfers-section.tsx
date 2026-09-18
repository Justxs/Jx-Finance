import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Pagination } from "@/components/pagination";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { type ReactNode, useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetAccountsEndpointQueryKey,
  getGetTransfersEndpointQueryKey,
  useCreateTransferEndpoint,
  useDeleteTransferEndpoint,
  useGetTransfersEndpointSuspense,
} from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modal";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { TransferForm } from "./transfer-form";

interface Props {
  accounts: AccountResponse[];
}

export function TransfersSection({ accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [addOpen, setAddOpen] = useState(false);

  const [page, setPage] = useState(1);
  const shownPage = useDeferredValue(page);
  const stale = shownPage !== page;
  const transfers = useGetTransfersEndpointSuspense({ page: shownPage, pageSize: 10 });
  const pages = Math.max(1, Math.ceil((transfers.data?.total ?? 0) / 10));
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetTransfersEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAccountsEndpointQueryKey() });
  }

  const createMutation = useCreateTransferEndpoint({
    mutation: {
      onSuccess: () => setAddOpen(false),
      onSettled: invalidate,
    },
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteTransferEndpoint({ mutation: { onSettled: invalidate } });

  const items = transfers.data?.items ?? [];

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  let content: ReactNode;
  if (items.length === 0) {
    content = <p className="px-6 py-6 text-sm text-muted-foreground">{t("transfers.empty")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border px-6">
        {items.map((transfer) => (
          <li
            key={transfer.id}
            className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 break-words">
              <p className="text-sm font-medium">
                {accountNames.get(transfer.fromAccountId ?? "")} →{" "}
                {accountNames.get(transfer.toAccountId ?? "")}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(transfer.date)}
                {transfer.description ? ` · ${transfer.description}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold tabular-nums">
                {money.format(Number(transfer.amount))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                pending={deletingId === transfer.id}
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(transfer.id!)}
                aria-label={t("actions.delete")}
                title={t("actions.delete")}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
        <h2 className="font-semibold">{t("transfers.title")}</h2>
        <Button disabled={accounts.length < 2} size="sm" onClick={() => setAddOpen(true)}>
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
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </section>
  );
}
