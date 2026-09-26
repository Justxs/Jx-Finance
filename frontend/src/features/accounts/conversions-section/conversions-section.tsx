import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getConversionsQueryKey,
  useCategoriesSuspense,
  useDeleteConversion,
  useConversionsSuspense,
} from "@/api/generated";
import type {
  AccountResponse,
  ConversionResponse,
  PagedResponseOfConversionResponse,
} from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { EditModal, Modal } from "@/components/modal";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { RecordRow } from "@/components/record-row/record-row";
import { Button } from "@/components/ui/button/button";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney, useRateFormat, useUsableCurrencies } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";
import { optimisticPagedRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { metaLine } from "@/lib/utils";
import { MOVEMENTS_PAGE_SIZE as pageSize, movementsPageParams } from "../account-queries";
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

  const paging = usePagedList();
  const listParams = movementsPageParams(paging.shownPage);
  const conversions = useConversionsSuspense(listParams);
  const { items, pages } = usePagedItems(paging, conversions.data, pageSize);
  const accountNames = nameById(accounts);

  const categories = useCategoriesSuspense().data;
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const deleteMutation = useDeleteConversion({
    mutation: optimisticPagedRemoval<PagedResponseOfConversionResponse>(
      getConversionsQueryKey(listParams),
      getConversionsQueryKey(),
    ),
  });

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

    return metaLine(formatDate(conversion.date), rate, fee, conversion.description);
  }

  const remove = useConfirmedDelete(
    deleteMutation,
    items,
    (conversion) => `${accountNames.get(conversion.accountId) ?? ""} · ${amounts(conversion)}`,
    "conversion",
  );

  const content = (
    <PagedRows
      paging={paging}
      pages={pages}
      count={items.length}
      emptyText={t("conversions.empty")}
    >
      {items.map((conversion) => (
        <RecordRow
          key={conversion.id}
          title={accountNames.get(conversion.accountId) ?? ""}
          subtitle={details(conversion)}
          note={conversion.isImported ? t("conversions.importedHint") : null}
          amount={amounts(conversion)}
          label={`${amounts(conversion)}, ${formatDate(conversion.date)}`}
          onEdit={conversion.isImported ? undefined : () => setEditTarget(conversion.id)}
          {...remove.deleteProps(conversion.id)}
        />
      ))}
    </PagedRows>
  );

  return (
    <Section>
      <SectionHeader title={t("conversions.heading")}>
        <Button
          variant="outline"
          disabled={accounts.length === 0 || !canConvert}
          size="sm"
          onClick={() => onConvertAccountChange(accounts[0]?.id ?? null)}
        >
          <Plus />
          {t("conversions.add")}
        </Button>
      </SectionHeader>
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
            onClose={() => onConvertAccountChange(null)}
          />
        ) : null}
      </Modal>
      {content}
      <EditModal
        item={items.find((conversion) => conversion.id === editTarget) ?? null}
        title={t("conversions.editTitle")}
        onClose={() => setEditTarget(null)}
      >
        {(conversion, close) => (
          <ConversionForm
            accounts={accounts}
            categories={categories}
            conversion={conversion}
            onClose={close}
          />
        )}
      </EditModal>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
