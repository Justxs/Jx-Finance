import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { TagResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { nameById } from "@/lib/options";
import { TagEditForm } from "./tag-edit-form";

interface Props {
  tag: TagResponse;
  deletePending: boolean;
  deleteDisabled: boolean;
  onDelete: () => void;
}

export function TagRow({ tag, deletePending, deleteDisabled, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const households = useHouseholdsSuspense();
  const householdNames = nameById(households.data);

  return (
    <RowTransition>
      <li className="flex items-center justify-between gap-2 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="min-w-0 text-sm font-medium wrap-break-word">{tag.name}</span>
          {tag.scope === "shared" ? (
            <Tag tone="accent">
              {t("sharing.sharedWith", {
                household: householdNames.get(tag.householdId ?? "") ?? "",
              })}
            </Tag>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            aria-label={`${t("actions.edit")}: ${tag.name}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            pending={deletePending}
            disabled={deleteDisabled}
            onClick={onDelete}
            aria-label={`${t("actions.delete")}: ${tag.name}`}
          >
            <Trash2 />
          </Button>
        </div>

        <Modal open={editing} onOpenChange={setEditing} title={t("tags.editTitle")}>
          <TagEditForm
            tag={tag}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      </li>
    </RowTransition>
  );
}
