import type { ReactNode } from "react";

interface Props {
  title: string;
  children?: ReactNode;
}

export function PageHeader({ title, children }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="min-w-0 wrap-break-word text-2xl font-semibold">{title}</h1>
      {children ? (
        <div className="flex max-w-full flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
