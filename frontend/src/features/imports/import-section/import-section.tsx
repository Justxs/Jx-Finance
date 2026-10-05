import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getListImportInboxQueryKey,
  useCategoriesSuspense,
  useDismissImportInboxFile,
  useTagsSuspense,
  useTransactionGroupsSuspense,
  useTransactionsSuspense,
  useImportConfirm,
  useImportPreview,
  useInspectCsv,
  useListCsvMappingsSuspense,
} from "@/api/generated";
import type {
  AccountResponse,
  CsvMappingResponse,
  ImportConfirmGroup,
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
import { useFileField } from "@/hooks/use-file-field";
import { recallParams } from "@/lib/category-recall";
import { silentMutation } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { ImportPreviewError, problemDetail } from "./import-preview-error";
import { ImportResultPanel } from "./import-result";
import {
  type Step,
  UPLOAD,
  closingStatement,
  confirmRow,
  leaveMapping,
  reviewOf,
  withReview,
  withRows,
} from "./import-steps";
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
  onLeave?: () => void;
}

export function ImportSection({
  accounts,
  format,
  mapping: chosenMapping,
  initialAccountId,
  inbox,
  onEditedChange,
  confirmDiscard,
  onLeave,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
  const groups = useTransactionGroupsSuspense();
  const mappings = useListCsvMappingsSuspense();

  const [step, setStep] = useState<Step>(() =>
    inbox
      ? {
          kind: "review",
          review: {
            rows: toPreviewRows(inbox.preview.rows, history.data.items, categoryList),
            statement: inbox.preview.statement,
          },
        }
      : UPLOAD,
  );
  const [mapping, setMapping] = useState(chosenMapping);
  const review = reviewOf(step);

  const dismissMutation = useDismissImportInboxFile({
    mutation: optimisticRemoval(getListImportInboxQueryKey()),
  });

  function dropReview() {
    setStep((current) => withReview(current, undefined));
    onEditedChange(false);
  }

  function editRows(next: PreviewRowState[]) {
    setStep((current) => withRows(current, () => next));
    onEditedChange(true);
  }

  const previewMutation = useImportPreview({
    mutation: {
      ...silentMutation,
      onSuccess: (data) => {
        const rows = toPreviewRows(data.rows, history.data.items, categoryList);
        setStep((current) => withReview(current, { rows, statement: data.statement }));
        onEditedChange(false);
      },
    },
  });

  const inspectMutation = useInspectCsv({ mutation: silentMutation });

  const confirmMutation = useImportConfirm({
    mutation: {
      ...silentMutation,
      onSuccess: (data, variables) => {
        const confirmed = (review?.rows ?? []).filter((row) => row.selected);
        setStep({
          kind: "result",
          result: {
            imported: data.imported,
            linked: data.linked,
            skipped: data.skippedDuplicates,
            uncategorized: confirmed.filter((row) => takesCategory(row) && !row.categoryId).length,
            accountId: variables.data.accountId,
            reconciliation: data.reconciliation,
            ...importDateRange(confirmed),
          },
        });
        onEditedChange(false);
        fileField.reset();
        if (inbox) {
          dismissMutation.mutate({ id: inbox.item.id });
        }
      },
    },
  });

  function clearPreview() {
    dropReview();
    fileField.clearError();
    previewMutation.reset();
  }

  function takeFile() {
    return inbox?.file ?? fileField.take();
  }

  function inspect(
    options?: Partial<ReadOptions>,
    remapping = step.kind === "map" ? step.remapping : undefined,
  ) {
    const file = takeFile();
    if (!file) {
      return;
    }
    inspectMutation.mutate(
      { data: { file, ...options } },
      {
        onSuccess: (inspection) =>
          setStep((current) => ({
            kind: "map",
            inspection,
            remapping,
            review: reviewOf(current),
          })),
      },
    );
  }

  function closeMapping() {
    setStep(leaveMapping);
  }

  function preview(id: string, mappingId = mapping?.id) {
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
    closeMapping();
    preview(accountId, chosen.id);
  }

  function remap() {
    previewMutation.reset();
    inspect({ noHeaderRow: mapping?.noHeaderRow }, mapping);
  }

  function switchAccount(id: string) {
    setAccountId(id);
    dropReview();
    preview(id);
  }

  function updateRow(index: number, patch: Partial<PreviewRowState>) {
    setStep((current) =>
      withRows(current, (rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row))),
    );
    onEditedChange(true);
  }

  function handleConfirm(group: ImportConfirmGroup | null) {
    if (!review) {
      return;
    }
    confirmMutation.mutate({
      data: {
        accountId,
        format,
        mappingId: mapping?.id ?? null,
        group,
        statement: closingStatement(review.statement),
        rows: review.rows.filter((row) => row.selected).map(confirmRow),
      },
    });
  }

  const missingColumns = problemDetail(previewMutation.error, "import.missingColumns");

  if (step.kind === "result") {
    return (
      <ImportResultPanel
        result={step.result}
        onLeave={onLeave}
        onImportAnother={() => setStep(UPLOAD)}
      />
    );
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
          storedFileName={inbox?.file.name}
          format={format}
          onPreview={() => confirmDiscard(() => preview(accountId))}
          onFileChange={() => {
            fileField.clearError();
            previewMutation.reset();
            inspectMutation.reset();
            closeMapping();
          }}
          previewPending={previewMutation.isPending || inspectMutation.isPending}
          disabled={confirmMutation.isPending}
          fileError={fileField.error}
          secondary={Boolean(review?.rows.length)}
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
      </Section>

      {step.kind === "map" ? (
        <MappingStep
          inspection={step.inspection}
          remapping={step.remapping}
          mappings={mappings.data}
          cardAccount={accounts.find((account) => account.id === accountId)?.type === "creditCard"}
          readPending={inspectMutation.isPending}
          onRead={inspect}
          onApply={applyMapping}
          onCancel={closeMapping}
        />
      ) : null}

      {review ? (
        <Section className="space-y-4" aria-labelledby="import-review-title" data-wide="">
          <SectionTitle id="import-review-title">{t("imports.reviewSection")}</SectionTitle>
          {review.statement ? (
            <ImportStatementBar
              statement={review.statement}
              format={format}
              rows={review.rows}
              accounts={accounts}
              disabled={previewMutation.isPending || confirmMutation.isPending}
              onSwitchAccount={(id) => confirmDiscard(() => switchAccount(id))}
            />
          ) : null}
          <ImportPreviewTable
            rows={review.rows}
            accountId={accountId}
            accounts={accounts}
            categories={categoryList}
            tags={tagList}
            groups={groups.data}
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
            confirmError={confirmMutation.error}
          />
        </Section>
      ) : null}
    </div>
  );
}

interface MappingStepProps {
  inspection: InspectCsvResponse;
  remapping?: CsvMappingResponse;
  mappings: readonly CsvMappingResponse[];
  cardAccount: boolean;
  readPending: boolean;
  onRead: (options: ReadOptions) => void;
  onApply: (mapping: CsvMappingResponse) => void;
  onCancel: () => void;
}

function MappingStep({
  inspection,
  remapping,
  mappings,
  cardAccount,
  readPending,
  onRead,
  onApply,
  onCancel,
}: Readonly<MappingStepProps>) {
  const { t } = useTranslation();

  return (
    <Section className="space-y-4" aria-labelledby="import-mapping-title" data-wide="">
      <div className="space-y-1">
        <SectionTitle id="import-mapping-title">{t("imports.mapping.title")}</SectionTitle>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("imports.mapping.description")}
        </p>
      </div>
      <CsvMappingForm
        inspection={inspection}
        initial={remapping}
        fitting={mappings.filter((item) => inspection.matchingMappingIds.includes(item.id))}
        cardAccount={cardAccount}
        readPending={readPending}
        onRead={onRead}
        onUse={onApply}
        onSaved={onApply}
        onCancel={onCancel}
      />
    </Section>
  );
}
