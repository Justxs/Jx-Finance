import { useTranslation } from "react-i18next";
import {
  useContactEntriesSuspense,
  useDeleteContactPayment,
  useDeleteContactSplit,
} from "@/api/generated";
import type { ContactEntryResponse, ContactResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { RecordRow } from "@/components/record-row/record-row";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";
import { metaLine } from "@/lib/utils";

const PAGE_SIZE = 10;

interface Props {
  contact: ContactResponse;
}

export function ContactEntries({ contact }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const paging = usePagedList();
  const data = useContactEntriesSuspense(contact.id, {
    page: paging.shownPage,
    pageSize: PAGE_SIZE,
  }).data;
  const { items, pages, range } = usePagedItems(paging, data, PAGE_SIZE);
  const splits = items.filter((item) => item.kind === "split");
  const payments = items.filter((item) => item.kind === "payment");

  function titleOf(item: ContactEntryResponse) {
    if (item.kind === "split") {
      return item.description ?? formatDate(item.date);
    }
    return item.direction === "toContact"
      ? t("households.people.youPaid", { name: contact.name })
      : t("households.people.theyPaid", { name: contact.name });
  }

  const removeSplit = useConfirmedDelete(useDeleteContactSplit(), splits, titleOf, "contactSplit");
  const removePayment = useConfirmedDelete(
    useDeleteContactPayment(),
    payments,
    titleOf,
    "contactPayment",
  );

  return (
    <>
      <PagedRows
        paging={paging}
        pages={pages}
        range={range}
        count={items.length}
        emptyText={t("households.people.emptyHistory", { name: contact.name })}
      >
        {items.map((item) => (
          <RecordRow
            key={item.id}
            title={item.kind === "split" ? (item.description ?? EMPTY_VALUE) : titleOf(item)}
            subtitle={metaLine(
              formatDate(item.date),
              item.kind === "split" ? t("households.people.shareOfSplit") : item.description,
            )}
            note={item.counted ? undefined : t("households.shared.notCounted")}
            amount={money.format(Number(item.amount), item.currency)}
            label={titleOf(item)}
            {...(item.kind === "split"
              ? removeSplit.deleteProps(item.id)
              : removePayment.deleteProps(item.id))}
          />
        ))}
      </PagedRows>
      <ConfirmDeleteDialog {...removeSplit.dialogProps} />
      <ConfirmDeleteDialog {...removePayment.dialogProps} />
    </>
  );
}
