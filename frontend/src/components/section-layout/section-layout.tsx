import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header/page-header";

interface Props {
  title: string;
  description?: string;
  nav: ReactNode;
  children: ReactNode;
}

export function SectionLayout({ title, description, nav, children }: Readonly<Props>) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />
      <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        {nav}
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </div>
  );
}
