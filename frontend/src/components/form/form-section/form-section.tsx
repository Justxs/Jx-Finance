import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
}

export function FormSection({ title, children }: Readonly<Props>) {
  return (
    <fieldset className="space-y-3 border-t border-rule pt-4 *:clear-both">
      <legend className="float-left -mt-1 mb-2 w-full text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}
