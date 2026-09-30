import type { ReactNode } from "react";
import type { Scope } from "@/api/generated/model";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { Rows } from "@/components/ui/rows/rows";
import { IconButtonSkeleton, TextSkeleton, rowWidth } from "@/components/ui/skeleton/skeleton";

const rowClass = "flex items-center justify-between gap-2 py-1.5";

interface Props extends DeleteProps {
  name: string;
  scope: Scope;
  householdId: string | null;
  leading?: ReactNode;
  detail?: ReactNode;
  onEdit: () => void;
}

export function NamedRow({
  name,
  scope,
  householdId,
  leading,
  detail,
  onEdit,
  ...deleteProps
}: Readonly<Props>) {
  return (
    <RowTransition>
      <li className={rowClass}>
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 text-sm font-medium wrap-break-word">{name}</span>
            <SharedScopeTag scope={scope} householdId={householdId} />
            {detail ? (
              <span className="min-w-0 text-xs wrap-break-word text-muted-foreground">
                {detail}
              </span>
            ) : null}
          </div>
        </div>
        <RowActions label={name} onEdit={onEdit} {...deleteProps} />
      </li>
    </RowTransition>
  );
}

export function NamedRowsSkeleton({ rows = 5 }: Readonly<{ rows?: number }>) {
  return (
    <Rows data-slot="named-rows-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={rowClass}>
          <TextSkeleton size="sm" className="flex-1" width={rowWidth(index)} />
          <div className="flex items-center gap-1">
            <IconButtonSkeleton />
            <IconButtonSkeleton />
          </div>
        </li>
      ))}
    </Rows>
  );
}
