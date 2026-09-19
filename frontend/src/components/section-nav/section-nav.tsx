import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionNavItem<TSection extends string> {
  id: TSection;
  label: string;
  icon: LucideIcon;
}

interface Props<TSection extends string> {
  to: "/settings" | "/profile";
  label: string;
  current: TSection;
  items: readonly SectionNavItem<TSection>[];
}

export function SectionNav<TSection extends string>({
  to,
  label,
  current,
  items,
}: Readonly<Props<TSection>>) {
  return (
    <nav
      aria-label={label}
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:p-0"
    >
      {items.map((item) => {
        const active = item.id === current;
        return (
          <Link
            key={item.id}
            to={to}
            search={{ section: item.id } as never}
            replace
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground pointer-coarse:py-3",
              active && "bg-muted font-semibold text-foreground dark:bg-card",
            )}
          >
            <item.icon aria-hidden="true" className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
