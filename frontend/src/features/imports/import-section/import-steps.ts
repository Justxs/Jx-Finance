import type {
  CsvMappingResponse,
  ImportConfirmRow,
  ImportStatementSummary,
  InspectCsvResponse,
} from "@/api/generated/model";
import {
  type PreviewRowState,
  takesCategory,
} from "@/features/imports/import-preview-table/preview-rows";
import type { ImportResult } from "./import-result";

export interface Review {
  rows: PreviewRowState[];
  statement: ImportStatementSummary | null;
}

export type Step =
  | { kind: "upload" }
  | {
      kind: "map";
      inspection: InspectCsvResponse;
      remapping?: CsvMappingResponse;
      review?: Review;
    }
  | { kind: "review"; review: Review }
  | { kind: "result"; result: ImportResult };

export const UPLOAD: Step = { kind: "upload" };

export function reviewOf(step: Step) {
  return step.kind === "review" || step.kind === "map" ? step.review : undefined;
}

export function withReview(step: Step, review: Review | undefined): Step {
  if (step.kind === "map") {
    return { ...step, review };
  }
  return review ? { kind: "review", review } : UPLOAD;
}

export function withRows(step: Step, rows: (current: PreviewRowState[]) => PreviewRowState[]) {
  const review = reviewOf(step);
  return review ? withReview(step, { ...review, rows: rows(review.rows) }) : step;
}

export function leaveMapping(step: Step) {
  return step.kind === "map" ? withReview(UPLOAD, step.review) : step;
}

export function closingStatement(statement: ImportStatementSummary | null) {
  const { closingDate, closingBalance, closingCurrency } = statement ?? {};
  return closingDate && closingBalance && closingCurrency
    ? { closingDate, closingBalance, closingCurrency }
    : null;
}

export function confirmRow(row: PreviewRowState): ImportConfirmRow {
  const categorized = takesCategory(row);
  return {
    importRef: row.importRef,
    currency: row.currency,
    date: row.date,
    description: row.description,
    payee: row.payee,
    amount: row.amount,
    type: row.type,
    categoryId: categorized ? row.categoryId || null : null,
    tagIds: categorized ? row.tagIds : [],
    spreadMonths: categorized ? row.spreadMonths : null,
    spreadDirection: categorized && row.spreadMonths ? row.spreadDirection : null,
    transferAccountId: row.transferAccountId || null,
    existingTransferId: row.existingTransferId || null,
    existingTransactionId: row.existingTransactionId || null,
    asRefund: row.asRefund,
    refundOfTransactionId: row.refundOfTransactionId || null,
  };
}
