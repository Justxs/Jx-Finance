import { Keyboard } from "lucide-react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { useSettings } from "@/hooks/use-settings";
import { type Shortcut, visibleShortcuts } from "@/lib/shortcuts";
import { useShortcutsHelpOpen } from "@/stores/shortcuts-help-store";

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
              {key}
            </kbd>
          </Fragment>
        ))}
      </span>
    </li>
  );
}

interface Props {
  className?: string;
}

export function ShortcutsHelp({ className }: Readonly<Props>) {
  const { t } = useTranslation();
  const { open, setOpen } = useShortcutsHelpOpen();
  const { features } = useSettings();
  const available = visibleShortcuts((feature) => features[feature]);
  const actionShortcuts = available.filter((shortcut) => shortcut.group === "actions");
  const goToShortcuts = available.filter((shortcut) => shortcut.group === "goTo");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={className}
            aria-label={t("shortcuts.title")}
            tooltip={t("shortcuts.title")}
          >
            <Keyboard />
          </Button>
        }
      />
      <PopoverContent
        side="top"
        align="start"
        className="w-[min(30rem,calc(100vw-2rem))] gap-4 p-4"
      >
        <PopoverTitle className="text-lg leading-6">{t("shortcuts.title")}</PopoverTitle>
        <section aria-labelledby="shortcuts-actions">
          <h3 id="shortcuts-actions" className="text-xs font-medium text-muted-foreground">
            {t("shortcuts.actions")}
          </h3>
          <ul className="mt-1.5 border-t border-t-rule">
            {actionShortcuts.map((shortcut) => (
              <ShortcutRow key={shortcut.id} shortcut={shortcut} />
            ))}
          </ul>
        </section>
        <section aria-labelledby="shortcuts-go-to">
          <h3 id="shortcuts-go-to" className="text-xs font-medium text-muted-foreground">
            {t("shortcuts.goTo")}
          </h3>
          <ul className="mt-1.5 grid gap-x-6 border-t border-t-rule sm:grid-cols-2">
            {goToShortcuts.map((shortcut) => (
              <ShortcutRow key={shortcut.id} shortcut={shortcut} />
            ))}
          </ul>
        </section>
      </PopoverContent>
    </Popover>
  );
}
