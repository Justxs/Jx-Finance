import type { LucideIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface SectionNavItem {
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export interface SectionLinkProps {
  replace: true;
  "aria-current": "page" | undefined;
  className: string;
  children: ReactNode;
}

interface Props<TSection extends string> {
  labelKey: TranslationKey;
  current: TSection;
  sections: readonly TSection[];
  items: Readonly<Record<TSection, SectionNavItem>>;
  renderLink: (section: TSection, props: SectionLinkProps) => ReactNode;
}

export function SectionNav<TSection extends string>({
  labelKey,
  current,
  sections,
  items,
  renderLink,
}: Readonly<Props<TSection>>) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t(labelKey)}
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-6 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:p-0"
    >
      {sections.map((section) => {
        const { labelKey: itemLabelKey, icon: Icon } = items[section];
        const active = section === current;

        return (
          <Fragment key={section}>
            {renderLink(section, {
              replace: true,
              "aria-current": active ? "page" : undefined,
              className: cn(
                "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground pointer-coarse:py-3",
                active && "bg-muted font-semibold text-foreground dark:bg-card",
              ),
              children: (
                <>
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {t(itemLabelKey)}
                </>
              ),
            })}
          </Fragment>
        );
      })}
    </nav>
  );
}
