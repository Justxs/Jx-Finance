import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useBackupsSuspense, useDeleteBackup, useRestoreBackup } from "@/api/generated";
import type { BackupResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary";
import { Section, SectionTitle } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateTime } from "@/hooks/use-formatters";
import { setAuthenticated } from "@/lib/auth-gate";
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
  const [deleting, setDeleting] = useState<BackupResponse | null>(null);

  const deleteMutation = useDeleteBackup({
    mutation: {
      onSuccess: () => {
        toast.success(t("backup.deleted"));
      },
    },
  });

  const restoreMutation = useRestoreBackup({
    mutation: {
      meta: { silent: true },
      onSuccess: (restored) => {
        toast.success(t("backup.restored", { date: formatDateTime(restored.createdAt) }));
        setAuthenticated(false);
        queryClient.clear();
        navigate({ to: "/login" });
      },
    },
  });

  let busyId: string | null = null;
  if (restoreMutation.isPending) {
    busyId = restoreMutation.variables.id;
  } else if (deleteMutation.isPending) {
    busyId = deleteMutation.variables.id;
  }

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
        onDelete={setDeleting}
      />

      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={t("backup.editNote")}
        description={editing ? formatDateTime(editing.createdAt) : undefined}
      >
        {editing ? (
          <BackupNoteForm
            key={editing.id}
            backup={editing}
            onSaved={() => {
              toast.success(t("backup.noteSaved"));
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Modal>

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

      <ConfirmDeleteDialog
        target={deleting}
        itemLabel={deleting ? formatDateTime(deleting.createdAt) : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={(backup) => deleteMutation.mutate({ id: backup.id })}
      />
    </>
  );
}

export function BackupSection() {
  const { t } = useTranslation();

  return (
    <Section aria-labelledby="backup-title">
      <SectionTitle id="backup-title">{t("backup.title")}</SectionTitle>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{t("backup.description")}</p>
      <div className="mt-4 space-y-4">
        <CreateBackupForm />
        <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
          <BackupList />
        </QueryBoundary>
      </div>
      <div className="mt-8">
        <BackupUploadForm />
      </div>
    </Section>
  );
}
