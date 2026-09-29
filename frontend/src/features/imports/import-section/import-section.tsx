import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCategoriesSuspense,
  useTagsSuspense,
  useTransactionsSuspense,
  useImportConfirm,
  useImportPreview,
} from "@/api/generated";
import type {
  AccountResponse,
  ImportPreviewResponse,
  ImportStatementSummary,
  StatementFormat,
} from "@/api/generated/model";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useFileField } from "@/hooks/use-file-field";
import { silent } from "@/lib/mutations";
import { ImportPreviewTable } from "../import-preview-table/import-preview-table";
import { ImportStatementBar } from "../import-preview-table/import-statement-bar";
import {
  importDateRange,
  type PreviewRowState,
  takesCategory,
  toPreviewRows,
} from "../import-preview-table/preview-rows";
import { recallParams } from "../import-queries";
import { ImportPreviewError } from "./import-preview-error";
import { type ImportResult, ImportResultLine, useReconciliationText } from "./import-result";
import { IMPORT_FILE_INPUT_ID, ImportUploadForm, importFormats } from "./import-upload-form";

const uploadProblemKeys = {
  required: "imports.fileRequired",
  empty: "imports.fileEmpty",
  tooLarge: "imports.fileTooLarge",
} as const;

interface Props {
  accounts: AccountResponse[];
  format: StatementFormat;
  initialAccountId?: string;
  onEditedChange: (edited: boolean) => void;
  confirmDiscard: (run: () => void) => void;
}

export function ImportSection({
  accounts,
  format,
  initialAccountId,
  onEditedChange,
  confirmDiscard,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const reconciliationText = useReconciliationText();
  const fileField = useFileField(
    IMPORT_FILE_INPUT_ID,
    importFormats[format].maxBytes,
    uploadProblemKeys,
  );

  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.id === initialAccountId)?.id ?? accounts[0]?.id ?? "",
  );
  const [result, setResult] = useState<ImportResult | null>(null);
  const [rows, setRows] = useState<PreviewRowState[] | null>(null);
  const [statement, setStatement] = useState<ImportStatementSummary | null>(null);

  const categories = useCategoriesSuspense();
  const categoryList = categories.data;
  const tags = useTagsSuspense();
  const tagList = tags.data;
  const history = useTransactionsSuspense(recallParams);

  function replaceRows(next: PreviewRowState[] | null) {
    setRows(next);
    onEditedChange(false);
  }

  function editRows(next: PreviewRowState[]) {
    setRows(next);
    onEditedChange(true);
  }

  const previewMutation = useImportPreview(
    silent({
      onSuccess: (data: ImportPreviewResponse) => {
        replaceRows(toPreviewRows(data.rows, history.data.items, categoryList));
        setStatement(data.statement);
      },
    }),
  );

  const confirmMutation = useImportConfirm({
    mutation: {
      onSuccess: (data, variables) => {
        const confirmed = (rows ?? []).filter((row) => row.selected);
        toast.success(
          t("imports.confirmed", {
            imported: data.imported,
            linked: data.linked,
            skipped: data.skippedDuplicates,
          }),
          {
            description: data.reconciliation ? reconciliationText(data.reconciliation) : undefined,
          },
        );
        setResult({
          imported: data.imported,
          linked: data.linked,
          skipped: data.skippedDuplicates,
          accountId: variables.data.accountId,
          reconciliation: data.reconciliation,
          ...importDateRange(confirmed),
        });
        replaceRows(null);
        fileField.reset();
      },
    },
  });

  function clearPreview() {
    replaceRows(null);
    fileField.clearError();
    previewMutation.reset();
  }

  function preview(id: string) {
    const file = fileField.take();
    if (!id || !file) {
      return;
    }
    setResult(null);
    previewMutation.mutate({ data: { file, accountId: id, format } });
  }

  function switchAccount(id: string) {
    setAccountId(id);
    replaceRows(null);
    preview(id);
  }

  function updateRow(index: number, patch: Partial<PreviewRowState>) {
    setRows((prev) => prev?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null);
    onEditedChange(true);
  }

  function handleConfirm() {
    if (!rows) {
      return;
    }
    const selectedRows = rows.filter((row) => row.selected);
    const { closingDate, closingBalance, closingCurrency } = statement ?? {};
    confirmMutation.mutate({
      data: {
        accountId,
        format,
        statement:
          closingDate && closingBalance && closingCurrency
            ? { closingDate, closingBalance, closingCurrency }
            : null,
        rows: selectedRows.map((row) => ({
          importRef: row.importRef,
          currency: row.currency,
          date: row.date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          categoryId: takesCategory(row) ? row.categoryId || null : null,
          tagIds: takesCategory(row) ? row.tagIds : [],
          transferAccountId: row.transferAccountId || null,
          existingTransferId: row.existingTransferId || null,
          existingTransactionId: row.existingTransactionId || null,
          asRefund: row.asRefund,
          refundOfTransactionId: row.refundOfTransactionId || null,
        })),
      },
    });
  }

  return (
    <div className="space-y-5">
      <Section className="space-y-4">
        <ImportUploadForm
          key={fileField.key}
          accounts={accounts}
          accountId={accountId}
          onAccountChange={(id) =>
            confirmDiscard(() => {
              setAccountId(id);
              clearPreview();
            })
          }
          fileInputRef={fileField.inputProps.ref}
          format={format}
          onPreview={() => confirmDiscard(() => preview(accountId))}
          onFileChange={() => {
            fileField.clearError();
            previewMutation.reset();
          }}
          previewPending={previewMutation.isPending}
          disabled={confirmMutation.isPending}
          fileError={fileField.error}
          secondary={Boolean(rows?.length)}
        />
        {previewMutation.isError ? (
          <ImportPreviewError error={previewMutation.error} format={format} />
        ) : null}
        {result ? <ImportResultLine result={result} /> : null}
      </Section>

      {rows ? (
        <Section className="space-y-4" aria-labelledby="import-review-title">
          <SectionTitle id="import-review-title">{t("imports.reviewSection")}</SectionTitle>
          {statement ? (
            <ImportStatementBar
              statement={statement}
              rows={rows}
              accounts={accounts}
              disabled={previewMutation.isPending || confirmMutation.isPending}
              onSwitchAccount={(id) => confirmDiscard(() => switchAccount(id))}
            />
          ) : null}
          <ImportPreviewTable
            rows={rows}
            accountId={accountId}
            accounts={accounts}
            categories={categoryList}
            tags={tagList}
            onRowChange={updateRow}
            onRowsChange={editRows}
            onConfirm={handleConfirm}
            onCancel={() =>
              confirmDiscard(() => {
                clearPreview();
                fileField.reset();
              })
            }
            confirmPending={confirmMutation.isPending}
          />
        </Section>
      ) : null}
    </div>
  );
}
