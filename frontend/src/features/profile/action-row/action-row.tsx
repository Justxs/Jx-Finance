import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";

interface Props {
  title: ReactNode;
  details: ReactNode;
  icon: LucideIcon;
  actionLabel: string;
  itemLabel: string;
  pending: boolean;
  disabled: boolean;
  onAction?: () => void;
}

export function ActionRow({
  title,
  details,
  icon: Icon,
  actionLabel,
  itemLabel,
  pending,
  disabled,
  onAction,
}: Readonly<Props>) {
  return (
    <RowTransition>
      <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium wrap-break-word">
            {title}
          </p>
          {details}
        </div>
        {onAction ? (
          <Button
            variant="outline"
            size="sm"
            className="self-start sm:self-auto"
            pending={pending}
            disabled={disabled}
            onClick={onAction}
            aria-label={`${actionLabel}: ${itemLabel}`}
          >
            <Icon />
            {actionLabel}
          </Button>
        ) : null}
      </li>
    </RowTransition>
  );
}
