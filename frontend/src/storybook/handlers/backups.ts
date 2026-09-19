import {
  getBackupsMockHandler,
  getCreateBackupMockHandler,
  getDeleteBackupMockHandler,
  getRestoreBackupMockHandler,
  getUpdateBackupMockHandler,
  getUploadBackupMockHandler,
} from "@/api/generated/backups/backups.msw";
import type { BackupResponse } from "@/api/generated/model";
import { backupRestored, backups } from "@/storybook/fixtures";
import { found, readBody, text } from "./http";

function freshBackup(note: string | null, uploaded: boolean): BackupResponse {
  return {
    id: crypto.randomUUID(),
    createdAt: "2026-09-18T20:00:00Z",
    note,
    sizeBytes: 415_302,
    tables: 27,
    rows: 4820,
    uploaded,
    restorable: true,
  };
}

export const backupHandlers = [
  getBackupsMockHandler(backups),
  getCreateBackupMockHandler(async ({ request }) =>
    freshBackup(text((await readBody(request)).note), false),
  ),
  getUploadBackupMockHandler(() => freshBackup(null, true)),
  getUpdateBackupMockHandler(async ({ request, params }) => ({
    ...found(backups.find((backup) => backup.id === params.id)),
    note: text((await readBody(request)).note),
  })),
  getDeleteBackupMockHandler(),
  getRestoreBackupMockHandler(backupRestored),
];
