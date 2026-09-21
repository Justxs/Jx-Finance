import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PageHeader({ title, description, children }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="min-w-0 font-serif text-page-title font-semibold text-balance wrap-break-word lining-nums">
          {title}
        </h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children ? (
        <div className="flex max-w-full flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
          {children}
        </div>
      ) : null}
    </div>
  );
}
