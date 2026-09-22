import type { BackupResponse, ProblemDetails, RestoreBackupResponse } from "@/api/generated/model";

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

export const backupSchemaProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/backups/5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a01/restore",
  errors: [
    {
      name: "generalErrors",
      reason: "The backup was taken at another database version.",
      code: "backup.schemaMismatch",
    },
  ],
};

export const backupInvalidFileProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/backups/upload",
  errors: [
    {
      name: "generalErrors",
      reason: "The file is not a Jx Finance backup.",
      code: "backup.invalidFile",
    },
  ],
};

export const backupRestorePassword = "Correct-horse-42";

export const backupWrongPasswordProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/backups/5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a01/restore",
  errors: [
    {
      name: "generalErrors",
      reason: "The current password is incorrect.",
      code: "password.incorrect",
    },
  ],
};

export const backupPasswordRequiredProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/backups/5f0c1a52-7d7e-4a39-9a55-1f2f6f1b0a01/restore",
  errors: [{ name: "password", reason: "Password is required.", code: "required" }],
};

export const backupTooLargeProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/backups/upload",
  errors: [
    {
      name: "generalErrors",
      reason: "The backup holds more rows than this installation accepts.",
      code: "backup.tooLarge",
    },
  ],
};

export const lockedOutProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc6585#section-4",
  title: "Too many failed attempts.",
  status: 429,
  errors: [
    {
      name: "generalErrors",
      reason: "The account is locked for 15 minutes.",
      code: "credentials.lockedOut",
    },
  ],
};

export const databaseBusyProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.8",
  title: "The database was busy.",
  status: 409,
  errors: [
    {
      name: "generalErrors",
      reason: "Another operation held the database. Nothing was changed.",
      code: "conflict.busy",
    },
  ],
};
