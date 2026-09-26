import { Download, History, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getDownloadBackupUrl } from "@/api/generated";
import type { BackupResponse } from "@/api/generated/model";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { Tag } from "@/components/ui/tag/tag";
import { useBytes, useDateTime, useNumberFormat } from "@/hooks/use-formatters";

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
    <Table>
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
                    <span title={t("backup.otherVersionHint")}>
                      <Tag tone="negative">{t("backup.otherVersionTag")}</Tag>
                    </span>
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
                <div className="flex justify-end gap-1">
                  <a
                    href={getDownloadBackupUrl(backup.id)}
                    download
                    aria-label={`${t("backup.download")}: ${taken}`}
                    title={t("backup.download")}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon-sm",
                    })}
                  >
                    <Download />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId !== null}
                    onClick={() => onEditNote(backup)}
                    aria-label={`${t("backup.editNote")}: ${taken}`}
                    tooltip={t("backup.editNote")}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!backup.restorable || busyId !== null}
                    onClick={() => onRestore(backup)}
                    aria-label={`${t("backup.restoreAction")}: ${taken}`}
                    tooltip={
                      backup.restorable ? t("backup.restoreAction") : t("backup.otherVersionHint")
                    }
                  >
                    <History />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId !== null}
                    onClick={() => onDelete(backup)}
                    aria-label={`${t("backup.delete")}: ${taken}`}
                    tooltip={t("backup.delete")}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
