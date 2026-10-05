import { useMutation } from "@tanstack/react-query";
import { Inbox, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchFile } from "@/api/client";
import {
  getDownloadImportInboxFileUrl,
  getListImportInboxQueryKey,
  importPreview,
  useDismissImportInboxFile,
} from "@/api/generated";
import type {
  AccountResponse,
  ImportInboxFileResponse,
  ImportPreviewResponse,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { useDateTime } from "@/hooks/use-formatters";
import { pendingId } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";

export interface InboxReview {
  item: ImportInboxFileResponse;
  file: File;
  preview: ImportPreviewResponse;
}

interface Props {
  items: ImportInboxFileResponse[];
  accounts: AccountResponse[];
  onReview: (review: InboxReview) => void;
}

async function openReview(item: ImportInboxFileResponse): Promise<InboxReview> {
  const { blob } = await fetchFile(getDownloadImportInboxFileUrl(item.id));
  const file = new File([blob], item.fileName);
  const preview = await importPreview({
    file,
    accountId: item.accountId,
    format: item.format,
    mappingId: item.mappingId,
  });
  return { item, file, preview };
}

export function ImportInboxList({ items, accounts, onReview }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const [dismissing, setDismissing] = useState<ImportInboxFileResponse | null>(null);
  const reviewMutation = useMutation({ mutationFn: openReview, onSuccess: onReview });
  const dismissMutation = useDismissImportInboxFile({
    mutation: optimisticRemoval<ImportInboxFileResponse>(getListImportInboxQueryKey()),
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="import-inbox-title" className="mb-4 border-b pb-3">
      <h3 id="import-inbox-title" className="flex items-center gap-2 py-1 text-sm font-semibold">
        <Inbox aria-hidden="true" className="size-4 text-muted-foreground" />
        {t("imports.inbox.title")}
      </h3>
      <Rows>
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium wrap-break-word">{item.fileName}</span>
              <span className="block text-xs text-muted-foreground">
                {t("imports.inbox.received", {
                  account: accounts.find((account) => account.id === item.accountId)?.name ?? "",
                  date: formatDateTime(item.receivedAt),
                })}
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              pending={pendingId(reviewMutation) === item.id}
              disabled={reviewMutation.isPending}
              onClick={() => reviewMutation.mutate(item)}
              aria-label={`${t("imports.inbox.review")}: ${item.fileName}`}
            >
              {t("imports.inbox.review")}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              pending={pendingId(dismissMutation) === item.id}
              aria-label={`${t("imports.inbox.dismiss")}: ${item.fileName}`}
              onClick={() => setDismissing(item)}
            >
              <X />
            </Button>
          </li>
        ))}
      </Rows>
      <ConfirmDeleteDialog
        target={dismissing}
        itemLabel={dismissing?.fileName}
        title={t("imports.inbox.dismissTitle")}
        description={t("imports.inbox.dismissDescription")}
        confirmLabel={t("imports.inbox.dismiss")}
        onCancel={() => setDismissing(null)}
        onConfirm={(item) => {
          setDismissing(null);
          dismissMutation.mutate({ id: item.id });
        }}
      />
    </section>
  );
}
