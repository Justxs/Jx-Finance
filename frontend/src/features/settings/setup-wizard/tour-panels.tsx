import { ArrowLeftRight, CalendarCheck, Landmark, Tags } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ShortcutRow } from "@/components/shortcuts-help/shortcuts-help";
import { visibleShortcuts } from "@/lib/shortcuts";

const panels = [
  { name: "accounts", icon: Landmark },
  { name: "transactions", icon: ArrowLeftRight },
  { name: "sorting", icon: Tags },
  { name: "review", icon: CalendarCheck },
] as const;

export function TourPanels() {
  const { t } = useTranslation();
  const actions = visibleShortcuts(() => true).filter((shortcut) => shortcut.group === "actions");

  return (
    <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-[minmax(0,1fr)_15rem]">
      <ol>
        {panels.map(({ name, icon: Icon }) => (
          <li
            key={name}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 border-b py-3.5 first:pt-0"
          >
            <Icon aria-hidden="true" className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">
                {t(`settings.setupWizard.tour.panels.${name}.title`)}
              </h2>
              <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
                {t(`settings.setupWizard.tour.panels.${name}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <section aria-labelledby="setup-shortcuts">
        <h2 id="setup-shortcuts" className="text-xs font-medium text-muted-foreground">
          {t("settings.setupWizard.tour.shortcuts")}
        </h2>
        <ul className="mt-1.5 border-t border-t-rule text-sm">
          {actions.map((shortcut) => (
            <ShortcutRow key={shortcut.id} shortcut={shortcut} />
          ))}
        </ul>
      </section>
    </div>
  );
}
