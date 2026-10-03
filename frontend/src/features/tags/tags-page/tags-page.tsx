import { useTranslation } from "react-i18next";
import {
  getPayeeNamesQueryKey,
  getTagsQueryKey,
  useDeletePayeeName,
  useDeleteTag,
  usePayeeNamesSuspense,
  useTagsSuspense,
} from "@/api/generated";
import type { PayeeNameResponse, TagResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { ListSection, ListSectionSkeleton } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { NamedRow, NamedRowsSkeleton } from "@/components/named-row/named-row";
import { PageHeader } from "@/components/page-header/page-header";
import { PayeeNameForm } from "@/components/payee-name-form/payee-name-form";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { PlacesSection } from "@/features/places/places-section/places-section";
import { TagForm } from "@/features/tags/tag-form/tag-form";
import { useEditableList } from "@/hooks/use-editable-list";
import { useFeature } from "@/hooks/use-settings";
import { optimisticRemoval } from "@/lib/optimistic";

export function TagsPage() {
  const { t } = useTranslation();
  const payeeNamesEnabled = useFeature("payeeNames");
  const locationsEnabled = useFeature("locations");
  const tags = useEditableList(
    useTagsSuspense().data,
    useDeleteTag({ mutation: optimisticRemoval<TagResponse>(getTagsQueryKey()) }),
    (tag) => tag.name,
    "tag",
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("tags.title")}>
        <CreateDialog label={t("tags.add")} title={t("tags.addTitle")}>
          {(close) => <TagForm onClose={close} />}
        </CreateDialog>
      </PageHeader>

      <EditModal {...tags.editProps} title={(tag) => `${t("tags.editTitle")}: ${tag.name}`}>
        {(tag, close) => <TagForm initial={tag} onClose={close} />}
      </EditModal>

      <ListSection
        title={t("tags.title")}
        count={tags.list.length}
        description={t("tags.explainer")}
        emptyText={t("tags.empty")}
      >
        {tags.list.map((tag) => (
          <NamedRow
            key={tag.id}
            name={tag.name}
            scope={tag.scope}
            householdId={tag.householdId}
            {...tags.rowProps(tag)}
          />
        ))}
      </ListSection>

      {payeeNamesEnabled ? (
        <QueryBoundary
          fallback={
            <ListSectionSkeleton description>
              <NamedRowsSkeleton rows={2} />
            </ListSectionSkeleton>
          }
          errorSubject={t("payees.title")}
        >
          <PayeeNamesSection />
        </QueryBoundary>
      ) : null}

      {locationsEnabled ? (
        <QueryBoundary
          fallback={
            <ListSectionSkeleton description>
              <NamedRowsSkeleton rows={3} />
            </ListSectionSkeleton>
          }
          errorSubject={t("places.title")}
        >
          <PlacesSection />
        </QueryBoundary>
      ) : null}

      <ConfirmDeleteDialog {...tags.dialogProps} />
    </div>
  );
}

function PayeeNamesSection() {
  const { t } = useTranslation();
  const payees = useEditableList(
    usePayeeNamesSuspense().data,
    useDeletePayeeName({
      mutation: optimisticRemoval<PayeeNameResponse>(getPayeeNamesQueryKey()),
    }),
    (payee) => payee.name,
  );

  return (
    <>
      <EditModal {...payees.editProps} title={(payee) => `${t("payees.editTitle")}: ${payee.name}`}>
        {(payee, close) => (
          <PayeeNameForm payee={payee.payeeKey} initialName={payee.name} onClose={close} />
        )}
      </EditModal>

      <ListSection
        title={t("payees.title")}
        count={payees.list.length}
        description={t("payees.explainer")}
        emptyText={t("payees.empty")}
      >
        {payees.list.map((payee) => (
          <NamedRow
            key={payee.id}
            name={payee.name}
            scope="personal"
            householdId={null}
            detail={payee.payeeKey}
            {...payees.rowProps(payee)}
          />
        ))}
      </ListSection>

      <ConfirmDeleteDialog {...payees.dialogProps} />
    </>
  );
}
