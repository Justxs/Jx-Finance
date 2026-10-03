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
    <>
      <ol className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {panels.map(({ name, icon: Icon }) => (
          <li key={name} className="flex gap-3">
            <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">
                {t(`settings.setupWizard.tour.panels.${name}.title`)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(`settings.setupWizard.tour.panels.${name}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <section aria-labelledby="setup-shortcuts" className="mt-8 max-w-md">
        <h2 id="setup-shortcuts" className="text-xs font-medium text-muted-foreground">
          {t("settings.setupWizard.tour.shortcuts")}
        </h2>
        <ul className="mt-1.5 border-t border-t-rule text-sm">
          {actions.map((shortcut) => (
            <ShortcutRow key={shortcut.id} shortcut={shortcut} />
          ))}
        </ul>
      </section>
    </>
  );
}
