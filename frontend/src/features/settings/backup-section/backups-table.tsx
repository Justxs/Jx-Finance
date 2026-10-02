import { Download, History, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDownloadBackupUrl } from "@/api/generated";
import type { BackupResponse } from "@/api/generated/model";
import { RowActions } from "@/components/row-actions/row-actions";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { HintTag, Tag } from "@/components/ui/tag/tag";
import { useBytes, useDateTime, useNumberFormat } from "@/hooks/use-formatters";

function download(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  link.click();
}

interface Props {
  backups: BackupResponse[];
  busyId: string | null;
  onEditNote: (backup: BackupResponse) => void;
  onRestore: (backup: BackupResponse) => void;
  onDelete: (backup: BackupResponse) => void;
}

export function BackupsTable({
  backups,
  busyId,
  onEditNote,
  onRestore,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const formatBytes = useBytes();
  const count = useNumberFormat();

  if (backups.length === 0) {
    return <EmptyText size="sm">{t("backup.empty")}</EmptyText>;
  }

  return (
    <Table label={t("backup.listLabel")} className="min-w-160">
      <TableHeader>
        <TableRow>
          <TableHead>{t("backup.date")}</TableHead>
          <TableHead>{t("backup.note")}</TableHead>
          <TableHead numeric>{t("backup.size")}</TableHead>
          <TableHead numeric>{t("backup.rows")}</TableHead>
          <TableHead numeric>{t("backup.attachments")}</TableHead>
          <TableHead>
            <span className="sr-only">{t("common.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {backups.map((backup) => {
          const taken = formatDateTime(backup.createdAt);
          const busy = busyId === backup.id;
          return (
            <TableRow key={backup.id} className={busy ? "stale" : undefined} aria-busy={busy}>
              <TableCell>
                <span className="font-medium tabular-nums">{taken}</span>
                <span className="ml-2 inline-flex gap-1 align-middle">
                  {backup.uploaded ? <Tag>{t("backup.uploadedTag")}</Tag> : null}
                  {backup.restorable ? null : (
                    <HintTag tone="negative" hint={t("backup.otherVersionHint")}>
                      {t("backup.otherVersionTag")}
                    </HintTag>
                  )}
                </span>
              </TableCell>
              <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                {backup.note}
              </TableCell>
              <TableCell numeric>{formatBytes(backup.sizeBytes)}</TableCell>
              <TableCell numeric>{count.format(backup.rows)}</TableCell>
              <TableCell numeric>{count.format(backup.attachments)}</TableCell>
              <TableCell>
                <RowActions
                  label={taken}
                  className="justify-end"
                  actions={[
                    {
                      icon: Download,
                      label: t("backup.download"),
                      onSelect: () => download(getDownloadBackupUrl(backup.id)),
                    },
                    {
                      icon: Pencil,
                      label: t("backup.editNote"),
                      onSelect: () => onEditNote(backup),
                      disabled: busyId !== null,
                    },
                    {
                      icon: History,
                      label: t("backup.restoreAction"),
                      onSelect: () => onRestore(backup),
                      disabled: !backup.restorable || busyId !== null,
                    },
                  ]}
                  onDelete={() => onDelete(backup)}
                  deleteDisabled={busyId !== null}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
