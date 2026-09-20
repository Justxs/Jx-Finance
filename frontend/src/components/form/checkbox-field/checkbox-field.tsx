import type { FieldWithValue } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { cn } from "@/lib/utils";
import { fieldAria } from "../field-shell/field-shell";

interface Props {
  field: FieldWithValue<boolean>;
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  tone?: "muted" | "strong";
  disabled?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export function CheckboxField({
  field,
  id,
  label,
  hint,
  tone = "strong",
  disabled,
  className,
  onCheckedChange,
}: Readonly<Props>) {
  const { error, ...aria } = fieldAria(field, { id, hint });

  return (
    <div className={className}>
      <label
        className={cn(
          "flex items-center text-sm",
          tone === "muted" ? "gap-2 text-muted-foreground" : "gap-3 font-medium",
        )}
      >
        <Checkbox
          {...aria}
          checked={field.value}
          disabled={disabled}
          onCheckedChange={(next) => {
            field.handleChange(next);
            onCheckedChange?.(next);
          }}
        />
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mt-0.5 pl-7 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
