import type { AnyFieldApi } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { FieldError, Hint } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label/label";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  label?: ReactNode;
  hint?: ReactNode;
  hintRole?: "status";
  error?: string;
  className?: string;
  footer?: ReactNode;
  children: ReactNode;
}

interface FieldAriaOptions {
  id: string;
  hint?: ReactNode;
  touchedOnly?: boolean;
}

export function fieldAria(field: AnyFieldApi, { id, hint, touchedOnly }: FieldAriaOptions) {
  const visible = !touchedOnly || field.meta.isTouched;
  const error: string | undefined = visible ? field.errors[0]?.message : undefined;
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") ||
    undefined;

  return { error, "aria-invalid": Boolean(error), "aria-describedby": describedBy };
}

export function FieldShell({
  id,
  label,
  hint,
  hintRole,
  error,
  className,
  footer,
  children,
}: Readonly<Props>) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      {children}
      {hint ? (
        <Hint id={`${id}-hint`} role={hintRole}>
          {hint}
        </Hint>
      ) : null}
      <FieldError id={`${id}-error`} message={error} />
      {footer}
    </div>
  );
}
