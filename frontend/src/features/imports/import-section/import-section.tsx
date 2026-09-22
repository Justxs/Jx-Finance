import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCategoriesSuspense,
  useTagsSuspense,
  useTransactionsSuspense,
  useImportConfirm,
  useImportPreview,
} from "@/api/generated";
import type { AccountResponse, ImportPreviewResponse } from "@/api/generated/model";
import { Section, SectionTitle } from "@/components/ui/section/section";
import type { TranslationKey } from "@/lib/i18n";
import { silent } from "@/lib/mutations";
import { type UploadProblem, validateUpload } from "@/lib/upload-file";
import {
  importDateRange,
  ImportPreviewTable,
  type PreviewRowState,
  toPreviewRows,
} from "../import-preview-table";
import { recallParams } from "../import-queries";
import { ImportPreviewError } from "./import-preview-error";
import { type ImportResult, ImportResultLine } from "./import-result";
import { ImportUploadForm } from "./import-upload-form";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const uploadProblemKeys = {
  required: "imports.fileRequired",
  empty: "imports.fileEmpty",
  tooLarge: "imports.fileTooLarge",
} as const satisfies Record<UploadProblem, TranslationKey>;

interface Props {
  accounts: AccountResponse[];
  initialAccountId?: string;
}

export function ImportSection({ accounts, initialAccountId }: Readonly<Props>) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.id === initialAccountId)?.id ?? accounts[0]?.id ?? "",
  );
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [rows, setRows] = useState<PreviewRowState[] | null>(null);

  const categories = useCategoriesSuspense();
  const categoryList = categories.data ?? [];
  const tags = useTagsSuspense();
  const tagList = tags.data ?? [];
  const history = useTransactionsSuspense(recallParams);

  const previewMutation = useImportPreview(
    silent({
      onSuccess: (data: ImportPreviewResponse) => {
        setRows(toPreviewRows(data.rows ?? [], history.data?.items ?? [], categoryList));
      },
    }),
  );

  const confirmMutation = useImportConfirm({
    mutation: {
      onSuccess: (data, variables) => {
        const confirmed = (rows ?? []).filter((row) => row.selected);
        toast.success(
          t("imports.confirmed", { imported: data.imported, skipped: data.skippedDuplicates }),
        );
        setResult({
          imported: data.imported,
          skipped: data.skippedDuplicates,
          accountId: variables.data.accountId,
          ...importDateRange(confirmed),
        });
        setRows(null);
        setUploadKey((key) => key + 1);
      },
    },
  });

  function clearPreview() {
    setRows(null);
    setFileError(undefined);
    previewMutation.reset();
  }

  function handlePreview() {
    const file = fileInputRef.current?.files?.[0];
    if (!accountId) {
      return;
    }
    const problem = validateUpload(file, MAX_FILE_BYTES);
    if (!file || problem) {
      setFileError(t(uploadProblemKeys[problem ?? "required"]));
      return;
    }
    setFileError(undefined);
    setResult(null);
    previewMutation.mutate({ data: { file, accountId } });
  }

  function updateRow(index: number, patch: Partial<PreviewRowState>) {
    setRows((prev) => prev?.map((row, i) => (i === index ? { ...row, ...patch } : row)) ?? null);
  }

  function handleConfirm() {
    if (!rows) {
      return;
    }
    const selectedRows = rows.filter((row) => row.selected);
    confirmMutation.mutate({
      data: {
        accountId,
        rows: selectedRows.map((row) => ({
          importRef: row.importRef,
          currency: row.currency,
          date: row.date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          categoryId: row.transferAccountId ? null : row.categoryId || null,
          tagIds: row.transferAccountId ? [] : row.tagIds,
          transferAccountId: row.transferAccountId || null,
          existingTransferId: row.existingTransferId || null,
        })),
      },
    });
  }

  return (
    <div className="space-y-5">
      <Section className="space-y-4">
        <ImportUploadForm
          key={uploadKey}
          accounts={accounts}
          accountId={accountId}
          onAccountChange={(id) => {
            setAccountId(id);
            clearPreview();
          }}
          fileInputRef={fileInputRef}
          onPreview={handlePreview}
          onFileChange={clearPreview}
          previewPending={previewMutation.isPending}
          disabled={confirmMutation.isPending}
          fileError={fileError}
          secondary={Boolean(rows?.length)}
        />
        {previewMutation.isError ? <ImportPreviewError error={previewMutation.error} /> : null}
        {result ? <ImportResultLine result={result} /> : null}
      </Section>

      {rows ? (
        <Section className="space-y-4" aria-labelledby="import-review-title">
          <SectionTitle id="import-review-title">{t("imports.reviewSection")}</SectionTitle>
          <ImportPreviewTable
            rows={rows}
            accountId={accountId}
            accounts={accounts}
            categories={categoryList}
            tags={tagList}
            onRowChange={updateRow}
            onRowsChange={setRows}
            onConfirm={handleConfirm}
            onCancel={() => {
              clearPreview();
              setUploadKey((key) => key + 1);
            }}
            confirmPending={confirmMutation.isPending}
          />
        </Section>
      ) : null}
    </div>
  );
}
