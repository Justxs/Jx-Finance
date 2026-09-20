import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { CategoryResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
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
            {category.scope === "shared" ? (
              <Tag tone="accent">
                {t("sharing.sharedWith", {
                  household: householdNames.get(category.householdId ?? "") ?? "",
                })}
              </Tag>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={`${t("actions.edit")}: ${category.name}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            pending={deletePending}
            disabled={deleteDisabled}
            onClick={onDelete}
            aria-label={`${t("actions.delete")}: ${category.name}`}
          >
            <Trash2 />
          </Button>
        </div>

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
