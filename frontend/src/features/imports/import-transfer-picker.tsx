import { useTranslation } from "react-i18next";
import { useGetTransfersEndpoint } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import type { PreviewRowState } from "./import-preview-table";

export function ImportTransferPicker({
  row,
  accountId,
  accounts,
  onChange,
}: Readonly<{
  row: PreviewRowState;
  accountId: string;
  accounts: AccountResponse[];
  onChange: (patch: Partial<PreviewRowState>) => void;
}>) {
  const { t } = useTranslation();
  const transfers = useGetTransfersEndpoint(
    { date: row.date, page: 1, pageSize: 200 },
    { query: { enabled: !!row.transferAccountId } },
  );
  const matches = (transfers.data?.items ?? []).filter(
    (transfer) =>
      transfer.fromAccountId === (row.type === "expense" ? accountId : row.transferAccountId) &&
      transfer.toAccountId === (row.type === "income" ? accountId : row.transferAccountId) &&
      transfer.amount === row.amount,
  );
  return (
    <div className="min-w-44 space-y-2">
      <SelectField
        aria-label={t("imports.recordAs")}
        value={row.transferAccountId}
        onChange={(transferAccountId) => onChange({ transferAccountId, existingTransferId: "" })}
        options={[
          { value: "", label: t("imports.transaction") },
          ...accounts
            .filter((a) => a.id !== accountId)
            .map((a) => ({
              value: a.id!,
              label: t("imports.transferWith", { account: a.name }),
            })),
        ]}
      />
      {row.transferAccountId ? (
        <div aria-busy={transfers.isLoading}>
          <SelectField
            aria-label={t("imports.matchTransfer")}
            value={row.existingTransferId}
            className={transfers.isLoading ? "is-stale" : undefined}
            disabled={transfers.isLoading}
            onChange={(existingTransferId) => onChange({ existingTransferId })}
            options={[
              { value: "", label: t("imports.newTransfer") },
              ...matches.map((transfer) => ({
                value: transfer.id!,
                label: `${transfer.date} · ${transfer.amount} · ${transfer.description || t("imports.existingTransfer")}`,
              })),
            ]}
          />
        </div>
      ) : null}
      {row.transferAccountId ? (
        <p className="max-w-56 text-xs text-muted-foreground">{t("imports.matchHelp")}</p>
      ) : null}
    </div>
  );
}
