import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useBackupsSuspense, useDeleteBackup, useRestoreBackup } from "@/api/generated";
import type { BackupResponse, RestoreBackupResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { EditModal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { TitledSection } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDateTime } from "@/hooks/use-formatters";
import { endSession } from "@/lib/auth-gate";
import { notify, pendingId, silent } from "@/lib/mutations";
import { BackupNoteForm } from "./backup-note-form";
import { BackupUploadForm } from "./backup-upload-form";
import { BackupsTable } from "./backups-table";
import { CreateBackupForm } from "./create-backup-form";
import { RestoreBackupDialog } from "./restore-backup-dialog";

function BackupList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formatDateTime = useDateTime();
  const backups = useBackupsSuspense();
  const list = backups.data ?? [];
  const [editing, setEditing] = useState<BackupResponse | null>(null);
  const [restoring, setRestoring] = useState<BackupResponse | null>(null);

  const deleteMutation = useDeleteBackup(notify(t("backup.deleted")));

  const remove = useConfirmedDelete(deleteMutation, list, (backup) =>
    formatDateTime(backup.createdAt),
  );

  const restoreMutation = useRestoreBackup(
    silent({
      onSuccess: (restored: RestoreBackupResponse) => {
        toast.success(t("backup.restored", { date: formatDateTime(restored.createdAt) }));
        endSession(queryClient, navigate);
      },
    }),
  );

  const busyId = pendingId(restoreMutation) ?? pendingId(deleteMutation);

  return (
    <>
      <p className="text-sm">
        <span className="text-muted-foreground">{t("backup.last")}</span>{" "}
        <span className="font-semibold tabular-nums">
          {list[0] ? formatDateTime(list[0].createdAt) : t("backup.never")}
        </span>
      </p>
      <BackupsTable
        backups={list}
        busyId={busyId}
        onEditNote={setEditing}
        onRestore={(backup) => {
          restoreMutation.reset();
          setRestoring(backup);
        }}
        onDelete={(backup) => remove.request(backup.id)}
      />

      <EditModal
        item={editing}
        title={t("backup.editNote")}
        description={(backup) => formatDateTime(backup.createdAt)}
        onClose={() => setEditing(null)}
      >
        {(backup) => (
          <BackupNoteForm
            backup={backup}
            onSaved={() => {
              toast.success(t("backup.noteSaved"));
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </EditModal>

      <RestoreBackupDialog
        backupId={restoring?.id ?? null}
        label={restoring ? formatDateTime(restoring.createdAt) : null}
        error={restoreMutation.error}
        pending={restoreMutation.isPending}
        onCancel={() => setRestoring(null)}
        onRestore={async (password) => {
          if (restoring) {
            await restoreMutation.mutateAsync({ id: restoring.id, data: { password } });
            setRestoring(null);
          }
        }}
      />

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </>
  );
}

export function BackupSection() {
  const { t } = useTranslation();

  return (
    <TitledSection title={t("backup.title")} description={t("backup.description")}>
      <div className="mt-4 space-y-4">
        <CreateBackupForm />
        <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
          <BackupList />
        </QueryBoundary>
      </div>
      <div className="mt-8">
        <BackupUploadForm />
      </div>
    </TitledSection>
  );
}
