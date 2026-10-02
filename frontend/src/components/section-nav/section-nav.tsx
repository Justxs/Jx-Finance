import { Link, type LinkOptions } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  id: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  link: LinkOptions;
}

export interface SectionNavGroup {
  labelKey: TranslationKey;
  items: readonly SectionNavItem[];
}

interface Props {
  labelKey: TranslationKey;
  current: string;
  groups: readonly SectionNavGroup[];
}

export function pickSection<TSection extends string>(
  all: readonly TSection[],
  requested: TSection | undefined,
  fallback: TSection,
) {
  return all.find((item) => item === requested) ?? fallback;
}

export function SectionNav({ labelKey, current, groups }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t(labelKey)}
      className="-mx-1 -mt-1 flex gap-1 overflow-x-auto p-1 lg:sticky lg:top-6 lg:m-0 lg:flex-col lg:gap-5 lg:self-start lg:overflow-visible lg:p-0"
    >
      {groups.map((group) => (
        <div
          key={group.labelKey}
          role="group"
          aria-label={t(group.labelKey)}
          className="flex shrink-0 gap-1 lg:flex-col"
        >
          <p className="hidden px-3 pb-1 text-xs font-medium text-muted-foreground lg:block">
            {t(group.labelKey)}
          </p>
          {group.items.map(({ id, labelKey: itemLabelKey, icon: Icon, link }) => {
            const active = id === current;
            return (
              <Link
                key={id}
                {...link}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground focus-ring transition-colors duration-base ease-out-expo hover:text-foreground pointer-coarse:py-3",
                  active && "bg-muted font-semibold text-foreground dark:bg-card",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                {t(itemLabelKey)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
