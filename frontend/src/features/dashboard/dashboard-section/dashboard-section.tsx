import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  to?: LinkProps["to"];
  linkLabel?: string;
  className?: string;
  children: ReactNode;
}

export function DashboardSection({ title, to, linkLabel, className, children }: Readonly<Props>) {
  return (
    <section className={cn("panel", className)}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">{title}</h2>
        {to && linkLabel ? (
          <Link
            to={to}
            className="-my-1 inline-flex items-center gap-1 py-1 text-sm font-medium text-primary hover:underline"
          >
            {linkLabel}
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
