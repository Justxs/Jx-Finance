import { Plus } from "lucide-react";
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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Pagination } from "@/components/pagination/pagination";
import { RecordRow } from "@/components/record-row/record-row";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useIsoDate, useMoney, useRateFormat, useUsableCurrencies } from "@/hooks/use-formatters";
import { usePageClamp, usePagedList } from "@/hooks/use-paged-list";
import { silent } from "@/lib/mutations";
import { optimisticPagedRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
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

  const paging = usePagedList();
  const { page, setPage, shownPage, stale } = paging;
  const listParams = conversionsPageParams(shownPage);
  const conversions = useConversionsSuspense(listParams);
  const pages = usePageClamp(paging, conversions.data?.total ?? 0, pageSize);
  const accountNames = nameById(accounts);

  const createMutation = useCreateConversion(
    silent({ onSuccess: () => onConvertAccountChange(null) }),
  );
  const categories = useCategoriesSuspense().data ?? [];

  function closeConvert() {
    createMutation.reset();
    onConvertAccountChange(null);
  }
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const deleteMutation = useDeleteConversion({
    mutation: optimisticPagedRemoval<PagedResponseOfConversionResponse>(
      getConversionsQueryKey(listParams),
      getConversionsQueryKey(),
    ),
  });
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

  const remove = useConfirmedDelete(
    deleteMutation,
    items,
    (conversion) => `${accountNames.get(conversion.accountId) ?? ""} · ${amounts(conversion)}`,
  );

  let content: ReactNode;
  if (items.length === 0) {
    content = <EmptyText>{t("conversions.empty")}</EmptyText>;
  } else {
    content = (
      <Rows>
        {items.map((conversion) => (
          <RecordRow
            key={conversion.id}
            title={accountNames.get(conversion.accountId) ?? ""}
            subtitle={details(conversion)}
            note={conversion.isImported ? t("conversions.importedHint") : null}
            amount={amounts(conversion)}
            label={`${amounts(conversion)}, ${formatDate(conversion.date)}`}
            onEdit={conversion.isImported ? undefined : () => setEditTarget(conversion.id)}
            onDelete={() => remove.request(conversion.id)}
            deletePending={remove.pendingId === conversion.id}
            deleteDisabled={remove.busy}
          />
        ))}
      </Rows>
    );
  }

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
        onClose={closeConvert}
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
            error={createMutation.error}
            onSubmit={(values) => createMutation.mutateAsync({ data: values })}
            onCancel={closeConvert}
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
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
