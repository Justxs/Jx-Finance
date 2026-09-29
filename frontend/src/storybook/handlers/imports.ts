import {
  getCreateCsvMappingMockHandler,
  getDeleteCsvMappingMockHandler,
  getImportConfirmMockHandler,
  getImportPreviewMockHandler,
  getInspectCsvMockHandler,
  getListCsvMappingsMockHandler,
  getUpdateCsvMappingMockHandler,
} from "@/api/generated/imports/imports.msw";
import {
  csvMappings,
  importPreview,
  revolutInspection,
  revolutMapping,
} from "@/storybook/fixtures";
import { readBody } from "./http";
import type { Body } from "./http";
import { NEW_ID } from "./ids";
import { updateFrom } from "./lists";

export const importHandlers = [
  getImportPreviewMockHandler(importPreview),
  getImportConfirmMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const rows: Body[] = Array.isArray(body.rows) ? body.rows : [];
    const skipped = rows.filter((row) =>
      importPreview.rows.some((item) => item.importRef === row.importRef && item.isDuplicate),
    ).length;
    const linked = rows.filter((row) => Boolean(row.existingTransactionId)).length;
    return {
      imported: rows.length - skipped - linked,
      skippedDuplicates: skipped,
      linked,
      reconciliation: null,
    };
  }),
  getListCsvMappingsMockHandler(csvMappings),
  getCreateCsvMappingMockHandler(async ({ request }) => ({
    ...revolutMapping,
    ...(await readBody(request)),
    id: NEW_ID,
  })),
  getUpdateCsvMappingMockHandler(updateFrom(csvMappings)),
  getDeleteCsvMappingMockHandler(),
  getInspectCsvMockHandler(revolutInspection),
];
