import { Plus } from "lucide-react";
import { type ReactNode, useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getCategoriesQueryKey, useDeleteCategory, useCategoriesSuspense } from "@/api/generated";
import type { CategoryResponse, FlowType } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import type { TranslationKey } from "@/lib/i18n";
import { optimisticRemoval } from "@/lib/optimistic";
import { AddCategoryForm } from "../add-category-form/add-category-form";
import { CategoryRow } from "../category-row";

export function CategoriesPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const categories = useCategoriesSuspense();

  const deleteMutation = useDeleteCategory({
    mutation: {
      ...optimisticRemoval<CategoryResponse>(getCategoriesQueryKey()),
      onSuccess: () => toast.success(t("categories.deleted")),
    },
  });

  const categoryList = useDeferredValue(categories.data) ?? [];
  const remove = useConfirmedDelete(deleteMutation, categoryList, (category) => category.name);
  const groups: { type: FlowType; labelKey: TranslationKey }[] = [
    { type: "income", labelKey: "categories.income" },
    { type: "expense", labelKey: "categories.expense" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t("categories.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("categories.add")}
        </Button>
      </PageHeader>

      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("categories.addTitle")}>
        <AddCategoryForm onCreated={() => setAddOpen(false)} onCancel={() => setAddOpen(false)} />
      </Modal>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) => {
          const items = categoryList.filter((c) => c.type === group.type);

          let groupContent: ReactNode;
          if (items.length === 0) {
            groupContent = <EmptyText>{t("categories.empty")}</EmptyText>;
          } else {
            groupContent = (
              <Rows>
                {items.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onDelete={() => remove.request(category.id)}
                    deletePending={remove.pendingId === category.id}
                    deleteDisabled={remove.busy}
                  />
                ))}
              </Rows>
            );
          }

          return (
            <Section key={group.type}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <SectionTitle>{t(group.labelKey)}</SectionTitle>
                <span className="text-sm text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              {groupContent}
            </Section>
          );
        })}
      </div>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
