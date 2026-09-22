import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getHouseholdsSuspenseQueryOptions,
  getTagsSuspenseQueryOptions,
  useCreateBackup,
  useLogout,
  useMe,
} from "@/api/generated";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog/dialog";
import { useSettings } from "@/hooks/use-settings";
import { endSession } from "@/lib/auth-gate";
import type { ShortcutRouter } from "@/lib/shortcuts";
import { UserRole } from "@/lib/user-role";
import { cn } from "@/lib/utils";
import { setActiveHousehold, useActiveHouseholdId } from "@/stores/active-household-store";
import { setLocale, useLocale } from "@/stores/app-store";
import {
  rememberCommand,
  useCommandPaletteOpen,
  useCommandRecents,
} from "@/stores/command-palette-store";
import { setTheme, useTheme } from "@/stores/theme-store";
import { type CommandEntry, type CommandTarget, buildCommandEntries } from "../command-entries";
import { filterCommandEntries } from "../command-search";

const PALETTE_STALE_MS = 5 * 60 * 1000;

const RESULT_LIMIT = 50;

const listQuery = { staleTime: PALETTE_STALE_MS, throwOnError: false, meta: { silent: true } };

function wrapIndex(index: number, step: number, length: number) {
  return length === 0 ? 0 : (index + step + length) % length;
}

interface ContentProps {
  onClose: () => void;
}

function CommandPaletteContent({ onClose }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const listId = useId();
  const optionPrefix = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const me = useMe();
  const { features } = useSettings();
  const { theme } = useTheme();
  const { locale } = useLocale();
  const activeHouseholdId = useActiveHouseholdId();
  const recents = useCommandRecents();

  const accounts = useQuery({ ...getAccountsSuspenseQueryOptions(), ...listQuery });
  const categories = useQuery({ ...getCategoriesSuspenseQueryOptions(), ...listQuery });
  const tags = useQuery({ ...getTagsSuspenseQueryOptions(), ...listQuery });
  const households = useQuery({
    ...getHouseholdsSuspenseQueryOptions(),
    ...listQuery,
    enabled: features.households,
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => endSession(queryClient, (router as ShortcutRouter).navigate),
    },
  });

  const backupMutation = useCreateBackup({
    mutation: { onSuccess: () => toast.success(t("backup.created")) },
  });

  const entries = buildCommandEntries({
    t,
    features,
    isAdmin: me.data?.role === UserRole.admin,
    theme,
    locale,
    activeHouseholdId,
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    tags: tags.data ?? [],
    households: households.data ?? [],
  });

  const results = filterCommandEntries(entries, query, recents).slice(0, RESULT_LIMIT);
  const activeAt = Math.min(activeIndex, Math.max(results.length - 1, 0));
  const active = results[activeAt];

  function run(target: CommandTarget) {
    switch (target.kind) {
      case "navigate": {
        void (router as ShortcutRouter).navigate({ to: target.to, search: target.search });
        break;
      }
      case "theme": {
        setTheme(target.theme);
        break;
      }
      case "locale": {
        setLocale(target.locale);
        break;
      }
      case "household": {
        setActiveHousehold(target.householdId);
        void queryClient.invalidateQueries();
        break;
      }
      case "backup": {
        backupMutation.mutate({ data: { note: null } });
        break;
      }
      case "signOut": {
        logoutMutation.mutate();
        break;
      }
    }
  }

  function choose(entry: CommandEntry) {
    rememberCommand(entry.id);
    onClose();
    run(entry.target);
  }

  function chooseOnKey(event: KeyboardEvent<HTMLDivElement>, entry: CommandEntry) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(entry);
    }
  }

  function changeQuery(next: string) {
    setQuery(next);
    setActiveIndex(0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }

  function highlight(index: number) {
    setActiveIndex(index);
    const entry = results[index];
    const option = entry ? document.getElementById(`${optionPrefix}-${entry.id}`) : null;
    option?.scrollIntoView?.({ block: "nearest" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      highlight(wrapIndex(activeAt, 1, results.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      highlight(wrapIndex(activeAt, -1, results.length));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      highlight(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      highlight(Math.max(results.length - 1, 0));
      return;
    }
    if (event.key === "Enter" && active) {
      event.preventDefault();
      choose(active);
    }
  }

  const expanded = results.length > 0;

  return (
    <DialogContent
      showCloseButton={false}
      className="top-[8vh] max-h-[min(34rem,84vh)] translate-y-0 gap-0 p-0 sm:max-w-xl"
    >
      <DialogTitle className="sr-only">{t("commandPalette.title")}</DialogTitle>
      <DialogDescription className="sr-only">{t("commandPalette.description")}</DialogDescription>

      <div className="flex shrink-0 items-center gap-2 border-b px-3">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-label={t("commandPalette.searchLabel")}
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active ? `${optionPrefix}-${active.id}` : undefined}
          placeholder={t("commandPalette.placeholder")}
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-12 w-full min-w-0 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
      </div>

      <p role="status" className="sr-only">
        {t("commandPalette.count", { count: results.length })}
      </p>

      {expanded ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("commandPalette.resultsLabel")}
          className="min-h-0 overflow-y-auto overscroll-contain p-1.5"
        >
          {results.map((entry, index) => (
            <div
              key={entry.id}
              id={`${optionPrefix}-${entry.id}`}
              role="option"
              tabIndex={-1}
              aria-selected={entry.id === active?.id}
              onClick={() => choose(entry)}
              onKeyDown={(event) => chooseOnKey(event, entry)}
              onPointerMove={() => setActiveIndex(index)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
                entry.id === active?.id && "bg-muted text-foreground",
              )}
            >
              <span className="min-w-0 truncate">{entry.label}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{entry.hint}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground">{t("commandPalette.empty")}</p>
      )}
    </DialogContent>
  );
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPaletteOpen();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {open ? <CommandPaletteContent onClose={() => setOpen(false)} /> : null}
    </Dialog>
  );
}
