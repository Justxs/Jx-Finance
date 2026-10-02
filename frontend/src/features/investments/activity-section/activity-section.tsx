import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteInvestmentTransaction, useInvestmentTransactionsSuspense } from "@/api/generated";
import type {
  AccountResponse,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SelectField } from "@/components/select-field/select-field";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { HintTag } from "@/components/ui/tag/tag";
import { InvestmentEntryModal } from "@/features/investments/investment-entry-form/investment-entry-modal";
import { ACTIVITY_PAGE_SIZE, activityParams } from "@/features/investments/investment-queries";
import { entryTypes, isTrade, movesNoCash } from "@/features/investments/investment-types";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import {
  useIsoDate,
  useMoney,
  useNumberFormat,
  usePriceFormat,
  useQuantityFormat,
} from "@/hooks/use-formatters";
import { usePageClamp } from "@/hooks/use-paged-list";
import { nameById, optionsOf } from "@/lib/options";
import { INCOME_TONE } from "@/lib/tone";
import { cn, metaLine } from "@/lib/utils";

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
  const ratioFormat = useNumberFormat({ minimumFractionDigits: 0, maximumFractionDigits: 8 });

  const [type, setType] = useState<InvestmentTransactionType | "">("");
  const [page, setPage] = useState(1);

  const [shown, stale] = useDeferredParams({ page, type });
  const transactions = useInvestmentTransactionsSuspense(
    activityParams(shown.page, accountId, shown.type),
  );
  const pages = usePageClamp({ page, setPage }, transactions.data.total, ACTIVITY_PAGE_SIZE);
  const items = transactions.data.items;
  const accountNames = nameById(accounts);
  const severalAccounts = new Set(items.map((entry) => entry.accountId)).size > 1;

  const [editing, setEditing] = useState<InvestmentTransactionResponse | null>(null);
  const deleteMutation = useDeleteInvestmentTransaction();

  function title(entry: InvestmentTransactionResponse) {
    return metaLine(t(`investments.types.${entry.type}`), entry.symbol);
  }

  function volume(entry: InvestmentTransactionResponse) {
    if (isTrade(entry.type)) {
      return `${quantityFormat.format(Number(entry.quantity))} × ${formatPrice(Number(entry.price), entry.currency)}`;
    }

    if (entry.type === "symbolChange") {
      return t("investments.activity.movedTo", {
        quantity: quantityFormat.format(Number(entry.quantity)),
        symbol: entry.relatedSymbol ?? "",
      });
    }

    return entry.type === "split"
      ? t("investments.activity.splitRatio", {
          ratio: ratioFormat.format(Number(entry.quantity)),
        })
      : null;
  }

  function details(entry: InvestmentTransactionResponse) {
    const fee =
      isTrade(entry.type) && Number(entry.fee) > 0
        ? t("conversions.feeLine", { fee: money.format(Number(entry.fee), entry.currency) })
        : null;

    return metaLine(
      formatDate(entry.date),
      volume(entry),
      fee,
      severalAccounts ? accountNames.get(entry.accountId) : null,
      entry.description,
    );
  }

  function cash(entry: InvestmentTransactionResponse) {
    return money.formatSigned(Number(entry.cashAmount), "auto", entry.currency);
  }

  const remove = useConfirmedDelete(
    deleteMutation,
    items,
    (entry) => `${title(entry)} · ${formatDate(entry.date)} · ${cash(entry)}`,
    "investmentTransaction",
  );

  return (
    <Section>
      <SectionHeader title={t("investments.activity.title")}>
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
              ...optionsOf(entryTypes, (entryType) => t(`investments.types.${entryType}`)),
            ]}
          />
        </div>
      </SectionHeader>
      <PagedRows
        paging={{ page, setPage, stale }}
        pages={pages}
        range={{ total: transactions.data.total, pageSize: ACTIVITY_PAGE_SIZE }}
        count={items.length}
        emptyText={type === "" ? t("investments.activity.empty") : t("filters.noMatches")}
      >
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
                    {entry.source === "manual" ? null : (
                      <HintTag hint={t("investments.activity.importedLocked")}>
                        {t("investments.activity.imported")}
                      </HintTag>
                    )}
                  </p>
                  <p className="text-xs wrap-break-word text-muted-foreground tabular-nums">
                    {details(entry)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-right font-semibold whitespace-nowrap tabular-nums",
                    amount > 0 && INCOME_TONE,
                    movesNoCash(entry.type) && "font-normal text-muted-foreground",
                  )}
                >
                  {movesNoCash(entry.type) ? t("investments.activity.noCash") : cash(entry)}
                </span>
                <RowActions
                  label={label}
                  className="-mr-2 gap-3"
                  onEdit={entry.source === "manual" ? () => setEditing(entry) : undefined}
                  {...remove.deleteProps(entry.id)}
                >
                  {entry.source === "manual" ? null : (
                    <span className="size-8 shrink-0 max-sm:hidden" aria-hidden="true" />
                  )}
                </RowActions>
              </li>
            </RowTransition>
          );
        })}
      </PagedRows>
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
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
