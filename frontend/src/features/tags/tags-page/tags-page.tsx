import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getTagsQueryKey,
  useDeleteTag,
  useHouseholdsSuspense,
  useTagsSuspense,
} from "@/api/generated";
import type { TagResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { NamedRow } from "@/components/named-row/named-row";
import { PageHeader } from "@/components/page-header/page-header";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { optimisticRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { TagForm } from "../tag-form/tag-form";

export function TagsPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<TagResponse | null>(null);

  const tags = useTagsSuspense();
  const householdNames = nameById(useHouseholdsSuspense().data);

  const deleteMutation = useDeleteTag({
    mutation: optimisticRemoval<TagResponse>(getTagsQueryKey()),
  });

  const tagList = useDeferredValue(tags.data);
  const remove = useConfirmedDelete(deleteMutation, tagList, (tag) => tag.name, "tag");

  return (
    <div className="space-y-5">
      <PageHeader title={t("tags.title")}>
        <CreateDialog label={t("tags.add")} title={t("tags.addTitle")}>
          {(close) => <TagForm onDone={close} onCancel={close} />}
        </CreateDialog>
      </PageHeader>

      <EditModal item={editing} title={t("tags.editTitle")} onClose={() => setEditing(null)}>
        {(tag) => (
          <TagForm
            initial={tag}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </EditModal>

      <ListSection
        title={t("tags.title")}
        count={tagList.length}
        description={t("tags.explainer")}
        emptyText={t("tags.empty")}
      >
        {tagList.map((tag) => (
          <NamedRow
            key={tag.id}
            name={tag.name}
            scope={tag.scope}
            householdName={householdNames.get(tag.householdId ?? "")}
            onEdit={() => setEditing(tag)}
            onDelete={() => remove.request(tag.id)}
            deletePending={remove.pendingId === tag.id}
            deleteDisabled={remove.busy}
          />
        ))}
      </ListSection>

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
