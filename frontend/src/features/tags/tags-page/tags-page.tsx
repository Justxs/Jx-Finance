import { useTranslation } from "react-i18next";
import { getTagsQueryKey, useDeleteTag, useTagsSuspense } from "@/api/generated";
import type { TagResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { NamedRow } from "@/components/named-row/named-row";
import { PageHeader } from "@/components/page-header/page-header";
import { TagForm } from "@/features/tags/tag-form/tag-form";
import { useEditableList } from "@/hooks/use-editable-list";
import { optimisticRemoval } from "@/lib/optimistic";

export function TagsPage() {
  const { t } = useTranslation();
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

      <EditModal {...tags.editProps} title={t("tags.editTitle")}>
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

      <ConfirmDeleteDialog {...tags.dialogProps} />
    </div>
  );
}
