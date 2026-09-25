import type { BackupResponse, RestoreBackupResponse } from "@/api/generated/model";
import { problemOf } from "./problems";

export const backups: BackupResponse[] = [
  {
    id: "5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a01",
    createdAt: "2026-09-18T19:30:00Z",
    note: "Before the Swedbank import",
    sizeBytes: 412_876,
    tables: 27,
    rows: 4812,
    attachments: 38,
    uploaded: false,
    restorable: true,
  },
  {
    id: "5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a02",
    createdAt: "2026-09-01T06:00:00Z",
    note: null,
    sizeBytes: 398_112,
    tables: 27,
    rows: 4630,
    attachments: 35,
    uploaded: false,
    restorable: true,
  },
  {
    id: "5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a03",
    createdAt: "2026-06-30T21:15:00Z",
    note: "From the old server",
    sizeBytes: 5_873_220,
    tables: 25,
    rows: 61_204,
    attachments: 0,
    uploaded: true,
    restorable: false,
  },
];

export const backupRestored: RestoreBackupResponse = {
  createdAt: "2026-09-18T19:30:00Z",
  tables: 27,
  rows: 4812,
  attachments: 38,
};

export const backupSchemaProblem = problemOf(
  400,
  "backup.schemaMismatch",
  "The backup was taken at another database version.",
  { instance: "/api/backups/5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a01/restore" },
);

export const backupInvalidFileProblem = problemOf(
  400,
  "backup.invalidFile",
  "The file is not a Jx Finance backup.",
  { instance: "/api/backups/upload" },
);

export const backupRestorePassword = "Correct-horse-42";

export const backupWrongPasswordProblem = problemOf(
  400,
  "password.incorrect",
  "The current password is incorrect.",
  { instance: "/api/backups/5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a01/restore" },
);

export const backupPasswordRequiredProblem = problemOf(400, "required", "Password is required.", {
  name: "password",
  instance: "/api/backups/5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a01/restore",
});

export const backupTooLargeProblem = problemOf(
  400,
  "backup.tooLarge",
  "The backup holds more rows than this installation accepts.",
  { instance: "/api/backups/upload" },
);

export const lockedOutProblem = problemOf(
  429,
  "credentials.lockedOut",
  "The account is locked for 15 minutes.",
);

export const databaseBusyProblem = problemOf(
  409,
  "conflict.busy",
  "Another operation held the database. Nothing was changed.",
  { title: "The database was busy." },
);
