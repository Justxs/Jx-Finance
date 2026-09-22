import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { CategoryResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { CategoryIcon } from "@/lib/category-icons";
import { nameById } from "@/lib/options";
import { CategoryEditForm } from "./category-edit-form";

interface Props {
  category: CategoryResponse;
  deletePending: boolean;
  deleteDisabled: boolean;
  onDelete: () => void;
}

export function CategoryRow({
  category,
  deletePending,
  deleteDisabled,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const households = useHouseholdsSuspense();
  const householdNames = nameById(households.data);

  return (
    <RowTransition>
      <li className="flex items-center justify-between gap-2 py-1.5">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon icon={category.icon} className="shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 text-sm font-medium wrap-break-word">{category.name}</span>
            <SharedScopeTag
              scope={category.scope}
              householdName={householdNames.get(category.householdId ?? "")}
            />
          </div>
        </div>
        <RowActions
          label={category.name}
          onEdit={() => setEditing(true)}
          onDelete={onDelete}
          deletePending={deletePending}
          deleteDisabled={deleteDisabled}
        />

        <Modal open={editing} onOpenChange={setEditing} title={t("categories.editTitle")}>
          <CategoryEditForm
            category={category}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      </li>
    </RowTransition>
  );
}
