import type { ReactNode } from "react";
import type { Scope } from "@/api/generated/model";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";

interface Props {
  name: string;
  scope: Scope;
  householdName: string | undefined;
  leading?: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
  deleteDisabled: boolean;
}

export function NamedRow({
  name,
  scope,
  householdName,
  leading,
  onEdit,
  onDelete,
  deletePending,
  deleteDisabled,
}: Readonly<Props>) {
  return (
    <RowTransition>
      <li className="flex items-center justify-between gap-2 py-1.5">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 text-sm font-medium wrap-break-word">{name}</span>
            <SharedScopeTag scope={scope} householdName={householdName} />
          </div>
        </div>
        <RowActions
          label={name}
          onEdit={onEdit}
          onDelete={onDelete}
          deletePending={deletePending}
          deleteDisabled={deleteDisabled}
        />
      </li>
    </RowTransition>
  );
}
