import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import {
  type CommandEntry,
  type CommandTarget,
  buildCommandEntries,
  quickAddEntry,
  searchTransactionsEntry,
} from "@/features/command-palette/command-entries";
import { filterCommandEntries } from "@/features/command-palette/command-search";
import type { QuickAddDraft } from "@/features/command-palette/quick-add";
import { quickAddCategoryId } from "@/features/command-palette/quick-add-category";
import { useMoney } from "@/hooks/use-formatters";
import { useSettings, useTodayDate } from "@/hooks/use-settings";
import { endSession } from "@/lib/auth-gate";
import { latestEndedMonth } from "@/lib/calendar";
import { notify } from "@/lib/mutations";
import { silentQuery } from "@/lib/query-client";
import { UserRole } from "@/lib/user-role";
import { cn } from "@/lib/utils";
import { switchHousehold, useActiveHouseholdId } from "@/stores/active-household-store";
import { setLocale, useLocale } from "@/stores/app-store";
import {
  rememberCommand,
  useCommandPaletteOpen,
  useCommandRecents,
} from "@/stores/command-palette-store";
import { usePreferences } from "@/stores/preferences";
import { toggleAmountsHidden, useAmountsHidden } from "@/stores/privacy-store";
import { setTheme, useTheme } from "@/stores/theme-store";

const PALETTE_STALE_MS = 5 * 60 * 1000;

const RESULT_LIMIT = 50;

const listQuery = { staleTime: PALETTE_STALE_MS, ...silentQuery };

function wrapIndex(index: number, step: number, length: number) {
  return length === 0 ? 0 : (index + step + length) % length;
}

interface ContentProps {
  onClose: () => void;
}

function CommandPaletteContent({ onClose }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const listId = useId();
  const optionPrefix = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const me = useMe();
  const { features, defaultAccountId } = useSettings();
  const money = useMoney();
  const { lastAccountId } = usePreferences();
  const { theme } = useTheme();
  const { locale } = useLocale();
  const amountsHidden = useAmountsHidden();
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
      onSuccess: () => endSession(queryClient, navigate),
    },
  });

  const backupMutation = useCreateBackup({ mutation: notify(t("backup.created")) });

  const lastMonth = latestEndedMonth(useTodayDate());
  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];
  const entries = buildCommandEntries({
    t,
    features,
    isAdmin: me.data?.role === UserRole.admin,
    theme,
    locale,
    amountsHidden,
    activeHouseholdId,
    accounts: accountList,
    categories: categoryList,
    tags: tags.data ?? [],
    households: households.data ?? [],
    lastMonth,
  });

  const quickAdd = quickAddEntry(query, {
    t,
    accounts: accountList,
    lastAccountId,
    defaultAccountId,
    formatMoney: money.format,
  });
  const searchTransactions = searchTransactionsEntry(query, t);
  const typed = [quickAdd, ...filterCommandEntries(entries, query, recents)]
    .filter((entry) => entry !== null)
    .slice(0, RESULT_LIMIT);
  const results = searchTransactions ? [...typed, searchTransactions] : typed;
  const activeAt = Math.min(activeIndex, Math.max(results.length - 1, 0));
  const active = results[activeAt];

  async function startQuickAdd(draft: QuickAddDraft) {
    const categoryId = await quickAddCategoryId(queryClient, draft, categoryList, features);
    await navigate({
      to: "/transactions",
      search: { new: true },
      state: { transactionDraft: { ...draft, categoryId } },
    });
  }

  function run(target: CommandTarget) {
    switch (target.kind) {
      case "navigate": {
        void navigate(target.link);
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
      case "amounts": {
        toggleAmountsHidden();
        break;
      }
      case "household": {
        switchHousehold(queryClient, target.householdId);
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
      case "quickAdd": {
        void startQuickAdd(target.draft);
        break;
      }
    }
  }

  function choose(entry: CommandEntry) {
    if (entry !== quickAdd && entry !== searchTransactions) {
      rememberCommand(entry.id);
    }
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

  return (
    <DialogContent
      showCloseButton={false}
      className="top-[8vh] max-h-[min(34rem,84vh)] translate-y-0 gap-0 p-0 sm:max-w-xl"
    >
      <DialogTitle className="sr-only">{t("commandPalette.title")}</DialogTitle>
      <DialogDescription className="sr-only">{t("commandPalette.description")}</DialogDescription>

      <div className="flex shrink-0 items-center gap-2 border-b px-3 transition-colors has-[input:focus-visible]:border-ring">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-label={t("commandPalette.searchLabel")}
          aria-expanded
          aria-controls={listId}
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
