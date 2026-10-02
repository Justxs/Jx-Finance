import { useTranslation } from "react-i18next";
import { getCategoriesQueryKey, useCategoriesSuspense, useDeleteCategory } from "@/api/generated";
import type { CategoryResponse, FlowType } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { NamedRow } from "@/components/named-row/named-row";
import { PageHeader } from "@/components/page-header/page-header";
import { CategoryForm } from "@/features/categories/category-form/category-form";
import { RememberedItems } from "@/features/categories/remembered-items/remembered-items";
import { useEditableList } from "@/hooks/use-editable-list";
import { useFeature } from "@/hooks/use-settings";
import { CategoryIcon } from "@/lib/category-icons";
import type { TranslationKey } from "@/lib/i18n";
import { optimisticRemoval } from "@/lib/optimistic";
import { cn } from "@/lib/utils";

const groups: readonly { type: FlowType; labelKey: TranslationKey }[] = [
  { type: "income", labelKey: "categories.income" },
  { type: "expense", labelKey: "categories.expense" },
];

function inGroups(items: readonly CategoryResponse[]) {
  const ids = new Set(items.map((category) => category.id));
  const top = items.filter((category) => !category.parentId || !ids.has(category.parentId));
  return top.flatMap((parent) => [
    parent,
    ...items.filter((category) => category.parentId === parent.id),
  ]);
}

export function CategoriesPage() {
  const { t } = useTranslation();
  const receiptReadingEnabled = useFeature("receiptReading");
  const categories = useEditableList(
    useCategoriesSuspense().data,
    useDeleteCategory({ mutation: optimisticRemoval<CategoryResponse>(getCategoriesQueryKey()) }),
    (category) => category.name,
    "category",
  );
  const categoryList = categories.list;

  return (
    <div className="space-y-5">
      <PageHeader title={t("categories.title")}>
        <CreateDialog label={t("categories.add")} title={t("categories.addTitle")}>
          {(close) => <CategoryForm categories={categoryList} onClose={close} />}
        </CreateDialog>
      </PageHeader>

      <EditModal
        {...categories.editProps}
        title={(category) => `${t("categories.editTitle")}: ${category.name}`}
      >
        {(category, close) => (
          <CategoryForm categories={categoryList} initial={category} onClose={close} />
        )}
      </EditModal>

      <div className="grid gap-5 lg:grid-cols-2">
        {groups.map((group) => {
          const items = inGroups(categoryList.filter((category) => category.type === group.type));

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
                  householdId={category.householdId}
                  leading={
                    <CategoryIcon
                      icon={category.icon}
                      className={cn("shrink-0 text-muted-foreground", category.parentId && "ml-6")}
                    />
                  }
                  {...categories.rowProps(category)}
                />
              ))}
            </ListSection>
          );
        })}
      </div>

      {receiptReadingEnabled ? <RememberedItems /> : null}

      <ConfirmDeleteDialog {...categories.dialogProps} />
    </div>
  );
}
