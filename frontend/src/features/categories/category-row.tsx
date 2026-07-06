import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetHouseholdsEndpoint } from "@/api/generated";
import type { CategoryResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/lib/category-icons";
import { CategoryEditForm } from "./category-edit-form";

interface Props {
  category: CategoryResponse;
  deletePending: boolean;
  onDelete: () => void;
  onSaved: () => void;
}

export function CategoryRow({ category, deletePending, onDelete, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const households = useGetHouseholdsEndpoint();
  const householdNames = new Map(households.data?.map((h) => [h.id, h.name]) ?? []);

  if (editing) {
    return (
      <li className="space-y-3 py-3">
        <CategoryEditForm
          category={category}
          onSaved={() => {
            setEditing(false);
            onSaved();
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-2.5">
      <div className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CategoryIcon icon={category.icon} />
        </span>
        <span className="text-sm font-medium">{category.name}</span>
        {category.scope === "shared" ? (
          <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {t("sharing.sharedWith", { household: householdNames.get(category.householdId ?? "") ?? "" })}
          </span>
        ) : null}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setEditing(true)}
          aria-label={t("actions.edit")}
          title={t("actions.edit")}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={deletePending}
          onClick={onDelete}
          aria-label={t("actions.delete")}
          title={t("actions.delete")}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
