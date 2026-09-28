import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog/dialog";
import { useSettings } from "@/hooks/use-settings";
import { type Shortcut, shortcutKeyLabel, visibleShortcuts } from "@/lib/shortcuts";
import { cn } from "@/lib/utils";
import { useShortcutsHelpOpen } from "@/stores/shortcuts-help-store";

const groups = [
  { group: "actions", listClassName: undefined },
  { group: "goTo", listClassName: "grid gap-x-6 sm:grid-cols-2" },
] as const;

interface RowProps {
  shortcut: Shortcut;
}

function ShortcutRow({ shortcut }: Readonly<RowProps>) {
  const { t } = useTranslation();

  return (
    <li className="flex items-center justify-between gap-3 border-b py-1.5">
      <span className="min-w-0 wrap-break-word">{t(shortcut.labelKey)}</span>
      <span className="flex shrink-0 items-center gap-1">
        {shortcut.keys.map((key, index) => (
          <Fragment key={key}>
            {index > 0 ? (
              <span className="text-xs text-muted-foreground">{t("shortcuts.then")}</span>
            ) : null}
            <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-muted/40 px-1 font-mono text-xs">
              {shortcutKeyLabel(key)}
            </kbd>
          </Fragment>
        ))}
      </span>
    </li>
  );
}

export function ShortcutsHelp() {
  const { t } = useTranslation();
  const { open, setOpen } = useShortcutsHelpOpen();
  const { features } = useSettings();
  const available = visibleShortcuts((feature) => features[feature]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-4 sm:max-w-lg">
        <DialogTitle className="text-lg leading-6">{t("shortcuts.title")}</DialogTitle>
        {groups.map(({ group, listClassName }) => (
          <section key={group} aria-labelledby={`shortcuts-${group}`}>
            <h3 id={`shortcuts-${group}`} className="text-xs font-medium text-muted-foreground">
              {t(`shortcuts.${group}`)}
            </h3>
            <ul className={cn("mt-1.5 border-t border-t-rule", listClassName)}>
              {available
                .filter((shortcut) => shortcut.group === group)
                .map((shortcut) => (
                  <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                ))}
            </ul>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}
