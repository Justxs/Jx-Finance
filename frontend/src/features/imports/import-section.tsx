import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetAccountsEndpointQueryKey,
  getGetDashboardSummaryEndpointQueryKey,
  getGetTransactionsEndpointQueryKey,
  useGetCategoriesEndpoint,
  useImportConfirmEndpoint,
  useImportPreviewEndpoint,
} from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { ImportPreviewTable, type PreviewRowState } from "./import-preview-table";
import { ImportUploadForm } from "./import-upload-form";

interface Props {
  accounts: AccountResponse[];
}

export function ImportSection({ accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [rows, setRows] = useState<PreviewRowState[] | null>(null);

  const categories = useGetCategoriesEndpoint();
  const categoryList = categories.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetTransactionsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAccountsEndpointQueryKey() });
  }

  const previewMutation = useImportPreviewEndpoint({
    mutation: {
      onSuccess: (data) => {
        setRows(
          (data.rows ?? []).map((row) => ({
            ...row,
            selected: !row.isDuplicate,
            categoryId: "",
          })),
        );
      },
    },
  });

  const confirmMutation = useImportConfirmEndpoint({
    mutation: {
      onSuccess: (data) => {
        toast.success(t("imports.confirmed", { imported: data.imported, skipped: data.skippedDuplicates }));
        setRows(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        invalidate();
      },
    },
  });

  function handlePreview() {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !accountId) {
      return;
    }
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
          importRef: row.importRef!,
          date: row.date!,
          description: row.description,
          amount: row.amount!,
          type: row.type!,
          categoryId: row.categoryId || null,
        })),
      },
    });
  }

  return (
    <section className="card">
      <ImportUploadForm
        accounts={accounts}
        accountId={accountId}
        onAccountChange={setAccountId}
        fileInputRef={fileInputRef}
        onPreview={handlePreview}
        previewPending={previewMutation.isPending}
      />

      {rows ? (
        <div className="space-y-4 p-6">
          <ImportPreviewTable
            rows={rows}
            categories={categoryList}
            onRowChange={updateRow}
            onConfirm={handleConfirm}
            confirmPending={confirmMutation.isPending}
          />
        </div>
      ) : null}
    </section>
  );
}
