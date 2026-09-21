import { useTranslation } from "react-i18next";
import { useTransfers } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import type { PreviewRowState } from "./preview-rows";

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
  const money = useMoney();
  const formatDate = useIsoDate();
  const receiving = row.type === "income";
  const transfers = useTransfers(
    { date: row.date, page: 1, pageSize: 200 },
    { query: { enabled: Boolean(row.transferAccountId) } },
  );
  const matches = (transfers.data?.items ?? [])
    .map((transfer) => ({
      transfer,
      amount: receiving ? transfer.receivedAmount : transfer.amount,
      currency: receiving ? transfer.receivedCurrency : transfer.currency,
    }))
    .filter(
      ({ transfer, amount, currency }) =>
        transfer.fromAccountId === (receiving ? row.transferAccountId : accountId) &&
        transfer.toAccountId === (receiving ? accountId : row.transferAccountId) &&
        Number(amount) === Number(row.amount) &&
        currency === row.currency,
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
              value: a.id,
              label: t("imports.transferWith", { account: a.name }),
            })),
        ]}
      />
      {row.transferAccountId ? (
        <div aria-busy={transfers.isLoading}>
          <SelectField
            aria-label={t("imports.matchTransfer")}
            value={row.existingTransferId}
            className={transfers.isLoading ? "stale" : undefined}
            disabled={transfers.isLoading}
            onChange={(existingTransferId) => onChange({ existingTransferId })}
            options={[
              { value: "", label: t("imports.newTransfer") },
              ...matches.map(({ transfer, amount, currency }) => ({
                value: transfer.id,
                label: `${formatDate(transfer.date)} · ${money.format(Number(amount), currency)} · ${transfer.description || t("imports.existingTransfer")}`,
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
