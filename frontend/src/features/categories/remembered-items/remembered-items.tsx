import { Eraser } from "lucide-react";
import { useDeferredValue, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useCategoriesSuspense,
  useForgetReceiptItemCategory,
  useReceiptItemCategoriesSuspense,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { NamedRowsSkeleton } from "@/components/named-row/named-row";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowActions } from "@/components/row-actions/row-actions";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Input } from "@/components/ui/input/input";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useDateTime } from "@/hooks/use-formatters";
import { nameById } from "@/lib/options";

const SEARCH_WAIT_MS = 300;

function RememberedRows({ search }: Readonly<{ search: string }>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();
  const names = nameById(useCategoriesSuspense().data);
  const { items, total } = useReceiptItemCategoriesSuspense({
    search: search || undefined,
  }).data;
  const forget = useForgetReceiptItemCategory();
  const confirmed = useConfirmedDelete(forget, items, (item) => item.key);

  if (items.length === 0) {
    return (
      <EmptyText size="sm">
        {search ? t("categories.remembered.noMatches") : t("categories.remembered.empty")}
      </EmptyText>
    );
  }

  return (
    <>
      <Rows>
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium wrap-break-word">{item.key}</p>
              <p className="text-xs text-muted-foreground">
                {t("categories.remembered.detail", {
                  category: names.get(item.categoryId) ?? t("categories.remembered.unavailable"),
                  date: formatDateTime(item.lastUsed),
                })}
              </p>
            </div>
            <RowActions
              label={item.key}
              actions={[
                {
                  icon: Eraser,
                  label: t("categories.remembered.forget"),
                  onSelect: () => confirmed.request(item.id),
                  pending: confirmed.pendingId === item.id,
                  disabled: confirmed.busy,
                  destructive: true,
                },
              ]}
            />
          </li>
        ))}
      </Rows>
      {total > items.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("categories.remembered.more", { shown: items.length, total })}
        </p>
      ) : null}
      <ConfirmDeleteDialog
        {...confirmed.dialogProps}
        title={t("categories.remembered.forgetTitle")}
        description={t("categories.remembered.forgetDescription")}
        confirmLabel={t("categories.remembered.forget")}
      />
    </>
  );
}

export function RememberedItems() {
  const { t } = useTranslation();
  const searchId = useId();
  const [search, setSearch] = useState("");
  const text = useDebouncedDraft(search, setSearch, SEARCH_WAIT_MS);
  const shownSearch = useDeferredValue(search);

  return (
    <TitledSection
      title={t("categories.remembered.title")}
      description={t("categories.remembered.explainer")}
      bodyGap="md"
    >
      <FieldShell id={searchId} label={t("categories.remembered.search")} className="max-w-xs">
        <Input
          id={searchId}
          type="search"
          value={text.draft}
          onChange={(event) => text.change(event.target.value)}
        />
      </FieldShell>
      <QueryBoundary
        fallback={<NamedRowsSkeleton rows={3} />}
        errorSubject={t("categories.remembered.title")}
      >
        <StaleRegion stale={shownSearch !== search}>
          <RememberedRows search={shownSearch} />
        </StaleRegion>
      </QueryBoundary>
    </TitledSection>
  );
}
