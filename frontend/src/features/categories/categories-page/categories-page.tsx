import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getCategoriesQueryKey,
  useCategoriesSuspense,
  useDeleteCategory,
  useHouseholdsSuspense,
} from "@/api/generated";
import type { CategoryResponse, FlowType } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { NamedRow } from "@/components/named-row/named-row";
import { PageHeader } from "@/components/page-header/page-header";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { CategoryIcon } from "@/lib/category-icons";
import type { TranslationKey } from "@/lib/i18n";
import { optimisticRemoval } from "@/lib/optimistic";
import { nameById } from "@/lib/options";
import { CategoryForm } from "../category-form/category-form";

const groups: readonly { type: FlowType; labelKey: TranslationKey }[] = [
  { type: "income", labelKey: "categories.income" },
  { type: "expense", labelKey: "categories.expense" },
];

export function CategoriesPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<CategoryResponse | null>(null);

  const categories = useCategoriesSuspense();
  const householdNames = nameById(useHouseholdsSuspense().data);

  const deleteMutation = useDeleteCategory({
    mutation: optimisticRemoval<CategoryResponse>(getCategoriesQueryKey()),
  });

  const categoryList = useDeferredValue(categories.data);
  const remove = useConfirmedDelete(
    deleteMutation,
    categoryList,
    (category) => category.name,
    "category",
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t("categories.title")}>
        <CreateDialog label={t("categories.add")} title={t("categories.addTitle")}>
          {(close) => <CategoryForm onDone={close} onCancel={close} />}
        </CreateDialog>
      </PageHeader>

      <EditModal item={editing} title={t("categories.editTitle")} onClose={() => setEditing(null)}>
        {(category) => (
          <CategoryForm
            initial={category}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        )}
      </EditModal>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) => {
          const items = categoryList.filter((category) => category.type === group.type);

          return (
            <ListSection
              key={group.type}
              title={t(group.labelKey)}
              count={items.length}
              emptyText={t("categories.empty")}
            >
              {items.map((category) => (
                <NamedRow
                  key={category.id}
                  name={category.name}
                  scope={category.scope}
                  householdName={householdNames.get(category.householdId ?? "")}
                  leading={
                    <CategoryIcon icon={category.icon} className="shrink-0 text-muted-foreground" />
                  }
                  onEdit={() => setEditing(category)}
                  onDelete={() => remove.request(category.id)}
                  deletePending={remove.pendingId === category.id}
                  deleteDisabled={remove.busy}
                />
              ))}
            </ListSection>
          );
        })}
      </div>

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
