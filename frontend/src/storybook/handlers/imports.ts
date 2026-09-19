import {
  getImportConfirmMockHandler,
  getImportPreviewMockHandler,
} from "@/api/generated/imports/imports.msw";
import { importPreview } from "@/storybook/fixtures";
import { readBody } from "./http";
import type { Body } from "./http";

export const importHandlers = [
  getImportPreviewMockHandler(importPreview),
  getImportConfirmMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const rows: Body[] = Array.isArray(body.rows) ? body.rows : [];
    const skipped = rows.filter((row) =>
      importPreview.rows.some((item) => item.importRef === row.importRef && item.isDuplicate),
    ).length;
    return { imported: rows.length - skipped, skippedDuplicates: skipped };
  }),
];
