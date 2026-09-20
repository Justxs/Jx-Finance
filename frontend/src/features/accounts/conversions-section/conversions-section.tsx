import { Pencil, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getConversionsQueryKey,
  useCategoriesSuspense,
  useCreateConversion,
  useDeleteConversion,
  useConversionsSuspense,
} from "@/api/generated";
import type {
  AccountResponse,
  ConversionResponse,
  PagedResponseOfConversionResponse,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination";
import { RowTransition } from "@/components/row-transition";
import { Button } from "@/components/ui/button";
import { Rows } from "@/components/ui/rows";
import { Section, SectionTitle } from "@/components/ui/section";
import { StaleRegion } from "@/components/ui/stale-region";
import { useIsoDate, useMoney, useRateFormat, useUsableCurrencies } from "@/hooks/use-formatters";
import { optimisticPagedRemoval } from "@/lib/optimistic";
import { CONVERSIONS_PAGE_SIZE as pageSize, conversionsPageParams } from "../account-queries";
import { ConversionEditDialog } from "./conversion-edit-dialog";
import { ConversionForm } from "./conversion-form";

interface Props {
  accounts: AccountResponse[];
  convertAccountId: string | null;
  onConvertAccountChange: (accountId: string | null) => void;
}

export function ConversionsSection({
  accounts,
  convertAccountId,
  onConvertAccountChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const rateFormat = useRateFormat();
  const canConvert = useUsableCurrencies().length >= 2;

  const [page, setPage] = useState(1);
  const shownPage = useDeferredValue(page);
  const stale = shownPage !== page;
  const listParams = conversionsPageParams(shownPage);
  const conversions = useConversionsSuspense(listParams);
  const pages = Math.max(1, Math.ceil((conversions.data?.total ?? 0) / pageSize));
  if (page > pages) {
    setPage(pages);
  }
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));

  const createMutation = useCreateConversion({
    mutation: {
      onSuccess: () => onConvertAccountChange(null),
    },
  });
  const categories = useCategoriesSuspense().data ?? [];
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const deleteMutation = useDeleteConversion({
    mutation: optimisticPagedRemoval<PagedResponseOfConversionResponse>(
      getConversionsQueryKey(listParams),
      getConversionsQueryKey(),
    ),
  });
  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  const items = useDeferredValue(conversions.data?.items) ?? [];

  function amounts(conversion: ConversionResponse) {
    const sold = money.format(Number(conversion.fromAmount), conversion.fromCurrency);
    const bought = money.format(Number(conversion.toAmount), conversion.toCurrency);
    return `${sold} → ${bought}`;
  }

  function details(conversion: ConversionResponse) {
    const rate = t("conversions.rateLine", {
      from: conversion.fromCurrency.toUpperCase(),
      to: conversion.toCurrency.toUpperCase(),
      rate: rateFormat.format(Number(conversion.rate)),
    });
    const fee =
      conversion.feeAmount && conversion.feeCurrency
        ? t("conversions.feeLine", {
            fee: money.format(Number(conversion.feeAmount), conversion.feeCurrency),
          })
        : null;

    return [formatDate(conversion.date), rate, fee, conversion.description]
      .filter(Boolean)
      .join(" · ");
  }

  const deleteItem = items.find((conversion) => conversion.id === deleteTarget);
  const deleteLabel = deleteItem
    ? `${accountNames.get(deleteItem.accountId) ?? ""} · ${amounts(deleteItem)}`
    : undefined;

  let content: ReactNode;
  if (items.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{t("conversions.empty")}</p>;
  } else {
    content = (
      <Rows>
        {items.map((conversion) => (
          <RowTransition key={conversion.id}>
            <li className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 break-words">
                <p className="text-sm font-medium">
                  {accountNames.get(conversion.accountId) ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">{details(conversion)}</p>
                {conversion.isImported ? (
                  <p className="text-xs text-muted-foreground">{t("conversions.importedHint")}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-2 font-semibold whitespace-nowrap tabular-nums">
                  {amounts(conversion)}
                </span>
                {conversion.isImported ? null : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEditTarget(conversion.id)}
                    aria-label={`${t("actions.edit")}: ${amounts(conversion)}, ${formatDate(conversion.date)}`}
                    tooltip={`${t("actions.edit")}: ${amounts(conversion)}, ${formatDate(conversion.date)}`}
                  >
                    <Pencil />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  pending={deletingId === conversion.id}
                  disabled={deleteMutation.isPending}
                  onClick={() => setDeleteTarget(conversion.id)}
                  aria-label={`${t("actions.delete")}: ${amounts(conversion)}, ${formatDate(conversion.date)}`}
                  tooltip={`${t("actions.delete")}: ${amounts(conversion)}, ${formatDate(conversion.date)}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          </RowTransition>
        ))}
      </Rows>
    );
  }

  return (
    <Section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>{t("conversions.heading")}</SectionTitle>
        <Button
          variant="outline"
          disabled={accounts.length === 0 || !canConvert}
          size="sm"
          onClick={() => onConvertAccountChange(accounts[0]?.id ?? null)}
        >
          <Plus />
          {t("conversions.add")}
        </Button>
      </div>
      <Modal
        open={convertAccountId !== null}
        onOpenChange={(open) => {
          if (!open) {
            onConvertAccountChange(null);
          }
        }}
        title={t("conversions.title")}
        description={t("conversions.description")}
      >
        {convertAccountId ? (
          <ConversionForm
            key={convertAccountId}
            accounts={accounts}
            categories={categories}
            accountId={convertAccountId}
            pending={createMutation.isPending}
            onSubmit={(values) => createMutation.mutateAsync({ data: values })}
            onCancel={() => onConvertAccountChange(null)}
          />
        ) : null}
      </Modal>
      <StaleRegion stale={stale}>{content}</StaleRegion>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
      <ConversionEditDialog
        accounts={accounts}
        categories={categories}
        conversion={items.find((conversion) => conversion.id === editTarget) ?? null}
        onClose={() => setEditTarget(null)}
      />
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={deleteLabel}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </Section>
  );
}
