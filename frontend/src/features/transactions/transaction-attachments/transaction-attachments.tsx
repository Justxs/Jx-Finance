import { Download, FileText, ImageIcon, Paperclip, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getDownloadAttachmentUrl,
  useAttachmentsSuspense,
  useDeleteAttachment,
  useUploadAttachment,
} from "@/api/generated";
import type { AttachmentResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { useBytes } from "@/features/settings/backup-section/use-bytes";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDateTime } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_MEGABYTES,
  type Refusal,
  isPreviewable,
  sortFiles,
} from "./attachment-files";

interface RowProps {
  attachment: AttachmentResponse;
  removing: boolean;
  disabled: boolean;
  onRemove: () => void;
}

function Thumbnail({ attachment }: Readonly<{ attachment: AttachmentResponse }>) {
  const { t } = useTranslation();

  if (isPreviewable(attachment.contentType)) {
    return (
      <img
        src={getDownloadAttachmentUrl(attachment.id)}
        alt={t("transactions.attachments.preview", { name: attachment.fileName })}
        loading="lazy"
        className="size-12 shrink-0 rounded-md border border-border bg-muted object-cover"
      />
    );
  }

  const Icon = attachment.contentType === "application/pdf" ? FileText : ImageIcon;
  return (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
    >
      <Icon className="size-5" />
    </span>
  );
}

function AttachmentRow({ attachment, removing, disabled, onRemove }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const formatBytes = useBytes();
  const formatDateTime = useDateTime();
  const name = attachment.fileName;

  return (
    <RowTransition>
      <li className="flex items-center gap-3 py-2">
        <Thumbnail attachment={attachment} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={name}>
            {name}
          </p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">
            {formatBytes(attachment.sizeBytes)} ·{" "}
            {t("transactions.attachments.uploadedBy", {
              name: attachment.uploadedByName,
              date: formatDateTime(attachment.uploadedAt),
            })}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <a
            href={getDownloadAttachmentUrl(attachment.id)}
            download={name}
            aria-label={`${t("transactions.attachments.download")}: ${name}`}
            title={t("transactions.attachments.download")}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <Download />
          </a>
          <Button
            variant="ghost"
            size="icon-sm"
            pending={removing}
            disabled={disabled}
            onClick={onRemove}
            aria-label={`${t("transactions.attachments.remove")}: ${name}`}
          >
            <Trash2 />
          </Button>
        </div>
      </li>
    </RowTransition>
  );
}

function useRefusalText() {
  const { t } = useTranslation();

  return function refusalText(refusal: Refusal, free: number) {
    switch (refusal.reason) {
      case "tooLarge":
        return t("transactions.attachments.fileTooLarge", {
          name: refusal.name,
          size: MAX_ATTACHMENT_MEGABYTES,
        });
      case "typeNotAllowed":
        return t("transactions.attachments.fileTypeNotAllowed", { name: refusal.name });
      default:
        return t("transactions.attachments.tooMany", { name: refusal.name, free });
    }
  };
}

function AttachmentList({ transactionId }: Readonly<{ transactionId: string }>) {
  const { t } = useTranslation();
  const inputId = useId();
  const refusalText = useRefusalText();
  const attachments = useAttachmentsSuspense(transactionId).data;
  const uploadMutation = useUploadAttachment(silent());
  const removeMutation = useDeleteAttachment();
  const [waiting, setWaiting] = useState(0);
  const [refusals, setRefusals] = useState<{ items: Refusal[]; free: number }>({
    items: [],
    free: 0,
  });
  const [failure, setFailure] = useState<unknown>(null);
  const [dragging, setDragging] = useState(false);

  const free = Math.max(0, MAX_ATTACHMENTS - attachments.length);
  const uploading = waiting > 0;
  const full = free === 0;
  const remove = useConfirmedDelete(
    removeMutation,
    attachments,
    (attachment) => attachment.fileName,
    "attachment",
  );

  async function attach(files: File[]) {
    if (files.length === 0 || uploading) {
      return;
    }
    const sorted = sortFiles(files, free);
    setRefusals({ items: sorted.refused, free });
    setFailure(null);
    setWaiting(sorted.accepted.length);
    const results = await Promise.allSettled(
      sorted.accepted.map((file) =>
        uploadMutation
          .mutateAsync({ transactionId, data: { file } })
          .finally(() => setWaiting((count) => Math.max(0, count - 1))),
      ),
    );
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      setFailure(failed.reason);
    }
    const added = results.length - results.filter((result) => result.status === "rejected").length;
    if (added > 0) {
      toast.success(t("transactions.attachments.uploaded", { count: added }));
    }
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <EmptyText size="sm">{t("transactions.attachments.empty")}</EmptyText>
      ) : (
        <Rows aria-label={t("transactions.attachments.title")}>
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.id}
              attachment={attachment}
              removing={remove.pendingId === attachment.id}
              disabled={remove.busy}
              onRemove={() => remove.request(attachment.id)}
            />
          ))}
        </Rows>
      )}

      <label
        htmlFor={inputId}
        data-dragging={dragging || undefined}
        className={cn(
          "relative flex min-h-20 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-muted/40 px-3 py-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
          dragging && "border-primary bg-accent text-accent-foreground",
          (full || uploading) && "pointer-events-none opacity-60",
        )}
      >
        <Paperclip className="size-5 shrink-0" aria-hidden="true" />
        <span className="font-medium">
          {dragging ? t("transactions.attachments.dropActive") : t("transactions.attachments.drop")}
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          disabled={full || uploading}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDrop={() => setDragging(false)}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void attach(files);
          }}
        />
      </label>

      {uploading ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t("transactions.attachments.uploading", { count: waiting })}
        </p>
      ) : null}

      {refusals.items.length > 0 ? (
        <div role="alert">
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-expense">
            {refusals.items.map((refusal) => (
              <li key={`${refusal.reason}-${refusal.name}`}>
                {refusalText(refusal, refusals.free)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <FormError error={failure} />

      <ConfirmDeleteDialog
        {...remove.dialogProps}
        title={t("transactions.attachments.removeTitle")}
        confirmLabel={t("transactions.attachments.remove")}
      />
    </div>
  );
}

interface Props {
  transactionId: string;
  className?: string;
}

export function TransactionAttachments({ transactionId, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn("space-y-2", className)}>
      <div>
        <h3 id={headingId} className="text-sm font-semibold">
          {t("transactions.attachments.title")}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("transactions.attachments.hint", {
            size: MAX_ATTACHMENT_MEGABYTES,
            max: MAX_ATTACHMENTS,
          })}
        </p>
      </div>
      <QueryBoundary
        fallback={<Skeleton className="h-24 w-full" />}
        errorFallback={
          <p role="alert" className="text-sm text-expense">
            {t("transactions.attachments.loadError")}
          </p>
        }
      >
        <AttachmentList transactionId={transactionId} />
      </QueryBoundary>
    </section>
  );
}
