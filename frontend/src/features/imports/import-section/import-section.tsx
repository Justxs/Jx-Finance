import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getListImportInboxQueryKey,
  useCategoriesSuspense,
  useDismissImportInboxFile,
  useTagsSuspense,
  useTransactionsSuspense,
  useImportConfirm,
  useImportPreview,
  useInspectCsv,
  useListCsvMappingsSuspense,
} from "@/api/generated";
import type {
  AccountResponse,
  CsvMappingResponse,
  ImportStatementSummary,
  InspectCsvResponse,
  StatementFormat,
} from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import {
  CsvMappingForm,
  type ReadOptions,
} from "@/features/imports/csv-mapping-form/csv-mapping-form";
import type { InboxReview } from "@/features/imports/import-inbox-list/import-inbox-list";
import { ImportPreviewTable } from "@/features/imports/import-preview-table/import-preview-table";
import { ImportStatementBar } from "@/features/imports/import-preview-table/import-statement-bar";
import {
  importDateRange,
  type PreviewRowState,
  takesCategory,
  toPreviewRows,
} from "@/features/imports/import-preview-table/preview-rows";
import { recallParams } from "@/features/imports/import-queries";
import { useFileField } from "@/hooks/use-file-field";
import { silentMutation } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { ImportPreviewError, problemDetail } from "./import-preview-error";
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
  mapping?: CsvMappingResponse;
  initialAccountId?: string;
  inbox?: InboxReview;
  onEditedChange: (edited: boolean) => void;
  confirmDiscard: (run: () => void) => void;
}

export function ImportSection({
  accounts,
  format,
  mapping: chosenMapping,
  initialAccountId,
  inbox,
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
  const categories = useCategoriesSuspense();
  const categoryList = categories.data;
  const tags = useTagsSuspense();
  const tagList = tags.data;
  const history = useTransactionsSuspense(recallParams);
  const mappings = useListCsvMappingsSuspense();

  const [result, setResult] = useState<ImportResult | null>(null);
  const [rows, setRows] = useState<PreviewRowState[] | null>(() =>
    inbox ? toPreviewRows(inbox.preview.rows, history.data.items, categoryList) : null,
  );
  const [statement, setStatement] = useState<ImportStatementSummary | null>(
    inbox?.preview.statement ?? null,
  );
  const [mapping, setMapping] = useState(chosenMapping);
  const [inspection, setInspection] = useState<InspectCsvResponse | null>(null);
  const [remapping, setRemapping] = useState<CsvMappingResponse | undefined>(undefined);

  const dismissMutation = useDismissImportInboxFile({
    mutation: optimisticRemoval(getListImportInboxQueryKey()),
  });

  function replaceRows(next: PreviewRowState[] | null) {
    setRows(next);
    onEditedChange(false);
  }

  function editRows(next: PreviewRowState[]) {
    setRows(next);
    onEditedChange(true);
  }

  const previewMutation = useImportPreview({
    mutation: {
      ...silentMutation,
      onSuccess: (data) => {
        replaceRows(toPreviewRows(data.rows, history.data.items, categoryList));
        setStatement(data.statement);
      },
    },
  });

  const inspectMutation = useInspectCsv({
    mutation: { ...silentMutation, onSuccess: setInspection },
  });

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
        if (inbox) {
          dismissMutation.mutate({ id: inbox.item.id });
        }
      },
    },
  });

  function clearPreview() {
    replaceRows(null);
    fileField.clearError();
    previewMutation.reset();
  }

  function takeFile() {
    return inbox?.file ?? fileField.take();
  }

  function inspect(options?: Partial<ReadOptions>) {
    const file = takeFile();
    if (file) {
      inspectMutation.mutate({ data: { file, ...options } });
    }
  }

  function preview(id: string, mappingId = mapping?.id) {
    setResult(null);
    if (format === "genericCsv" && !mappingId) {
      inspect();
      return;
    }
    const file = takeFile();
    if (!id || !file) {
      return;
    }
    previewMutation.mutate({ data: { file, accountId: id, format, mappingId } });
  }

  function applyMapping(chosen: CsvMappingResponse) {
    setMapping(chosen);
    setInspection(null);
    setRemapping(undefined);
    preview(accountId, chosen.id);
  }

  function remap() {
    setRemapping(mapping);
    previewMutation.reset();
    inspect({ noHeaderRow: mapping?.noHeaderRow });
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
        mappingId: mapping?.id ?? null,
        statement:
          closingDate && closingBalance && closingCurrency
            ? { closingDate, closingBalance, closingCurrency }
            : null,
        rows: selectedRows.map((row) => ({
          importRef: row.importRef,
          currency: row.currency,
          date: row.date,
          description: row.description,
          payee: row.payee,
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

  const missingColumns = problemDetail(previewMutation.error, "import.missingColumns");

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
          storedFileName={inbox?.file.name}
          format={format}
          onPreview={() => confirmDiscard(() => preview(accountId))}
          onFileChange={() => {
            fileField.clearError();
            previewMutation.reset();
            inspectMutation.reset();
            setInspection(null);
          }}
          previewPending={previewMutation.isPending || inspectMutation.isPending}
          disabled={confirmMutation.isPending}
          fileError={fileField.error}
          secondary={Boolean(rows?.length)}
        />
        {previewMutation.isError ? (
          <ImportPreviewError error={previewMutation.error} format={format} />
        ) : null}
        {inspectMutation.isError ? (
          <ImportPreviewError error={inspectMutation.error} format={format} />
        ) : null}
        {missingColumns && mapping ? (
          <Button variant="outline" size="sm" onClick={remap}>
            {t("imports.mapping.updateFromFile")}
          </Button>
        ) : null}
        {result ? <ImportResultLine result={result} /> : null}
      </Section>

      {inspection ? (
        <Section className="space-y-4" aria-labelledby="import-mapping-title">
          <div className="space-y-1">
            <SectionTitle id="import-mapping-title">{t("imports.mapping.title")}</SectionTitle>
            <p className="max-w-prose text-sm text-muted-foreground">
              {t("imports.mapping.description")}
            </p>
          </div>
          <CsvMappingForm
            key={`${inspection.encoding}|${inspection.delimiter}|${inspection.skipLines}|${inspection.noHeaderRow}`}
            inspection={inspection}
            initial={remapping}
            fitting={mappings.data.filter((item) =>
              inspection.matchingMappingIds.includes(item.id),
            )}
            cardAccount={
              accounts.find((account) => account.id === accountId)?.type === "creditCard"
            }
            readPending={inspectMutation.isPending}
            onRead={inspect}
            onUse={applyMapping}
            onSaved={applyMapping}
            onCancel={() => setInspection(null)}
          />
        </Section>
      ) : null}

      {rows ? (
        <Section className="space-y-4" aria-labelledby="import-review-title">
          <SectionTitle id="import-review-title">{t("imports.reviewSection")}</SectionTitle>
          {statement ? (
            <ImportStatementBar
              statement={statement}
              format={format}
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
