import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { TagResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
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
          <SharedScopeTag
            scope={tag.scope}
            householdName={householdNames.get(tag.householdId ?? "")}
          />
        </div>
        <RowActions
          label={tag.name}
          onEdit={() => setEditing(true)}
          onDelete={onDelete}
          deletePending={deletePending}
          deleteDisabled={deleteDisabled}
        />

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
