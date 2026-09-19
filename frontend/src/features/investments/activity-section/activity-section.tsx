import { Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteInvestmentTransaction, useInvestmentTransactionsSuspense } from "@/api/generated";
import type {
  AccountResponse,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Pagination } from "@/components/pagination";
import { RowTransition } from "@/components/row-transition";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { Tooltip } from "@/components/ui/tooltip";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useIsoDate, useMoney, usePriceFormat, useQuantityFormat } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";
import { InvestmentEntryModal } from "../investment-entry-form";
import { ACTIVITY_PAGE_SIZE, activityParams } from "../investment-queries";
import { entryTypes, isTrade } from "../investment-types";

interface Props {
  accounts: readonly AccountResponse[];
  accountId?: string;
}

export function ActivitySection({ accounts, accountId }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const formatPrice = usePriceFormat();
  const quantityFormat = useQuantityFormat();

  const [type, setType] = useState<InvestmentTransactionType | "">("");
  const [page, setPage] = useState(1);
  const [filterKey, setFilterKey] = useState(accountId);
  if (filterKey !== accountId) {
    setFilterKey(accountId);
    setPage(1);
  }

  const [shown, stale] = useDeferredParams({ page, type });
  const transactions = useInvestmentTransactionsSuspense(
    activityParams(shown.page, accountId, shown.type),
  );
  const pages = Math.max(1, Math.ceil((transactions.data?.total ?? 0) / ACTIVITY_PAGE_SIZE));
  if (page > pages) {
    setPage(pages);
  }
  const items = transactions.data?.items ?? [];
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const severalAccounts = new Set(items.map((entry) => entry.accountId)).size > 1;

  const [editing, setEditing] = useState<InvestmentTransactionResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const deleteMutation = useDeleteInvestmentTransaction();
  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  function title(entry: InvestmentTransactionResponse) {
    return [t(`investments.types.${entry.type}`), entry.symbol].filter(Boolean).join(" · ");
  }

  function volume(entry: InvestmentTransactionResponse) {
    if (isTrade(entry.type)) {
      return `${quantityFormat.format(Number(entry.quantity))} × ${formatPrice(Number(entry.price), entry.currency)}`;
    }

    return entry.type === "split"
      ? t("investments.activity.splitRatio", {
          ratio: quantityFormat.format(Number(entry.quantity)),
        })
      : null;
  }

  function details(entry: InvestmentTransactionResponse) {
    const fee =
      isTrade(entry.type) && Number(entry.fee) > 0
        ? t("conversions.feeLine", { fee: money.format(Number(entry.fee), entry.currency) })
        : null;

    return [
      formatDate(entry.date),
      volume(entry),
      fee,
      severalAccounts ? accountNames.get(entry.accountId) : null,
      entry.description,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function cash(entry: InvestmentTransactionResponse) {
    return money.formatSigned(Number(entry.cashAmount), "auto", entry.currency);
  }

  const deleteItem = items.find((entry) => entry.id === deleteTarget);
  const deleteLabel = deleteItem
    ? `${title(deleteItem)} · ${formatDate(deleteItem.date)} · ${cash(deleteItem)}`
    : undefined;

  let content: ReactNode;
  if (items.length === 0) {
    content = (
      <p className="py-6 text-sm text-muted-foreground">
        {type ? t("filters.noMatches") : t("investments.activity.empty")}
      </p>
    );
  } else {
    content = (
      <ul className="rows">
        {items.map((entry) => {
          const amount = Number(entry.cashAmount);
          const label = `${title(entry)}, ${formatDate(entry.date)}`;

          return (
            <RowTransition key={entry.id}>
              <li className="flex items-center gap-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium">{t(`investments.types.${entry.type}`)}</span>
                    {entry.symbol ? <span className="font-semibold">{entry.symbol}</span> : null}
                    {entry.source === "interactiveBrokers" ? (
                      <Tooltip content={t("investments.activity.importedLocked")}>
                        <span className="inline-flex">
                          <Tag>
                            {t("investments.activity.imported")}
                            <span className="sr-only">
                              . {t("investments.activity.importedLocked")}
                            </span>
                          </Tag>
                        </span>
                      </Tooltip>
                    ) : null}
                  </p>
                  <p className="text-xs wrap-break-word text-muted-foreground tabular-nums">
                    {details(entry)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-right font-semibold whitespace-nowrap tabular-nums",
                    amount > 0 && "text-income",
                    entry.type === "split" && "font-normal text-muted-foreground",
                  )}
                >
                  {entry.type === "split" ? t("investments.activity.noCash") : cash(entry)}
                </span>
                {entry.source === "manual" ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => setEditing(entry)}
                    aria-label={`${t("actions.edit")}: ${label}`}
                    tooltip={`${t("actions.edit")}: ${label}`}
                  >
                    <Pencil />
                  </Button>
                ) : (
                  <span className="size-8 shrink-0 max-sm:hidden" aria-hidden="true" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-2 size-8 shrink-0"
                  pending={deletingId === entry.id}
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleteTarget(entry.id)}
                  aria-label={`${t("actions.delete")}: ${label}`}
                  tooltip={`${t("actions.delete")}: ${label}`}
                >
                  <Trash2 />
                </Button>
              </li>
            </RowTransition>
          );
        })}
      </ul>
    );
  }

  return (
    <section className="section">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">{t("investments.activity.title")}</h2>
        <div className="w-full sm:w-52">
          <SelectField
            aria-label={t("investments.activity.typeFilter")}
            value={type}
            onChange={(value) => {
              setType(value);
              setPage(1);
            }}
            options={[
              { value: "", label: t("investments.activity.allTypes") },
              ...entryTypes.map((entryType) => ({
                value: entryType,
                label: t(`investments.types.${entryType}`),
              })),
            ]}
          />
        </div>
      </div>
      <div className={stale ? "is-stale" : undefined} aria-busy={stale}>
        {content}
      </div>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <InvestmentEntryModal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        accounts={accounts}
        editing={editing ?? undefined}
      />
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={deleteLabel}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </section>
  );
}
