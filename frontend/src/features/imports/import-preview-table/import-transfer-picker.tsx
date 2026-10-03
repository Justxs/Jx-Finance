import { useTranslation } from "react-i18next";
import { useTransfers } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { type PreviewRowState, refundPatch } from "./preview-rows";

const LINK_ENTRY = "entry";
const REFUND = "refund";
const REFUND_OF = "refund-of";

function recordedAs(row: PreviewRowState) {
  if (row.existingTransactionId) {
    return LINK_ENTRY;
  }
  if (row.asRefund) {
    return row.refundOfTransactionId ? REFUND_OF : REFUND;
  }
  return row.transferAccountId;
}

export function ImportTransferPicker({
  row,
  label,
  accountId,
  accounts,
  onChange,
}: Readonly<{
  row: PreviewRowState;
  label: string;
  accountId: string;
  accounts: AccountResponse[];
  onChange: (patch: Partial<PreviewRowState>) => void;
}>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const receiving = row.type === "income";
  const matched = row.matchedTransaction;
  const candidate = row.refundCandidate;
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

  function choose(value: string) {
    if (value === REFUND || value === REFUND_OF) {
      onChange(refundPatch(row, value === REFUND_OF));
      return;
    }
    const leftRefund = row.asRefund
      ? { asRefund: false, refundOfTransactionId: "", categoryId: "" }
      : {};
    onChange(
      value === LINK_ENTRY && matched
        ? {
            ...leftRefund,
            existingTransactionId: matched.id,
            transferAccountId: "",
            existingTransferId: "",
          }
        : {
            ...leftRefund,
            existingTransactionId: "",
            transferAccountId: value,
            existingTransferId: "",
          },
    );
  }

  return (
    <div className="space-y-2">
      <SelectField
        aria-label={label}
        value={recordedAs(row)}
        onChange={choose}
        options={[
          ...(matched
            ? [
                {
                  value: LINK_ENTRY,
                  label: t("imports.linkEntry", { date: formatDate(matched.date) }),
                },
              ]
            : []),
          ...(receiving && candidate
            ? [
                {
                  value: REFUND_OF,
                  label: t("imports.refundOf", {
                    date: formatDate(candidate.date),
                    description: candidate.description || EMPTY_VALUE,
                  }),
                },
              ]
            : []),
          ...(receiving ? [{ value: REFUND, label: t("imports.refund") }] : []),
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
        <p className="text-xs whitespace-normal text-muted-foreground">{t("imports.matchHelp")}</p>
      ) : null}
    </div>
  );
}
