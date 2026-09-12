import { useTranslation } from "react-i18next";
import { useGetTransfersEndpoint } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { Select } from "@/components/ui/select";
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
      <Select
        aria-label={t("imports.recordAs")}
        value={row.transferAccountId}
        onChange={(e) => onChange({ transferAccountId: e.target.value, existingTransferId: "" })}
      >
        <option value="">{t("imports.transaction")}</option>
        {accounts
          .filter((a) => a.id !== accountId)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {t("imports.transferWith", { account: a.name })}
            </option>
          ))}
      </Select>
      {row.transferAccountId ? (
        <Select
          aria-label={t("imports.matchTransfer")}
          value={row.existingTransferId}
          onChange={(e) => onChange({ existingTransferId: e.target.value })}
        >
          <option value="">{t("imports.newTransfer")}</option>
          {matches.map((transfer) => (
            <option key={transfer.id} value={transfer.id}>
              {transfer.date} · {transfer.amount} ·{" "}
              {transfer.description || t("imports.existingTransfer")}
            </option>
          ))}
        </Select>
      ) : null}
      {row.transferAccountId ? (
        <p className="max-w-56 text-xs text-muted-foreground">{t("imports.matchHelp")}</p>
      ) : null}
    </div>
  );
}
