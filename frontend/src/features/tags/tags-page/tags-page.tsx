import { Plus } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getTagsQueryKey, useDeleteTag, useTagsSuspense } from "@/api/generated";
import type { TagResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { optimisticRemoval } from "@/lib/optimistic";
import { AddTagForm } from "../add-tag-form/add-tag-form";
import { TagRow } from "../tag-row";

export function TagsPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const tags = useTagsSuspense();

  const deleteMutation = useDeleteTag({
    mutation: {
      ...optimisticRemoval<TagResponse>(getTagsQueryKey()),
      onSuccess: () => toast.success(t("tags.deleted")),
    },
  });

  const tagList = useDeferredValue(tags.data) ?? [];
  const remove = useConfirmedDelete(deleteMutation, tagList, (tag) => tag.name);

  return (
    <div className="space-y-5">
      <PageHeader title={t("tags.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("tags.add")}
        </Button>
      </PageHeader>

      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("tags.addTitle")}>
        <AddTagForm onCreated={() => setAddOpen(false)} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <SectionTitle>{t("tags.title")}</SectionTitle>
          <span className="text-sm text-muted-foreground tabular-nums">{tagList.length}</span>
        </div>
        <p className="mb-3 max-w-prose text-sm text-muted-foreground">{t("tags.explainer")}</p>
        {tagList.length === 0 ? (
          <EmptyText>{t("tags.empty")}</EmptyText>
        ) : (
          <Rows>
            {tagList.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onDelete={() => remove.request(tag.id)}
                deletePending={remove.pendingId === tag.id}
                deleteDisabled={remove.busy}
              />
            ))}
          </Rows>
        )}
      </Section>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
