import { Autocomplete } from "@base-ui/react/autocomplete";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
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
import { setActiveHousehold, useActiveHouseholdId } from "@/stores/active-household-store";
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

interface ContentProps {
  onClose: () => void;
}

function CommandPaletteContent({ onClose }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

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
        setActiveHousehold(target.householdId);
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

  return (
    <DialogContent
      showCloseButton={false}
      className="top-[8vh] max-h-[min(34rem,84vh)] translate-y-0 gap-0 p-0 sm:max-w-xl"
    >
      <DialogTitle className="sr-only">{t("commandPalette.title")}</DialogTitle>
      <DialogDescription className="sr-only">{t("commandPalette.description")}</DialogDescription>

      <Autocomplete.Root
        open
        inline
        items={results}
        filter={null}
        value={query}
        onValueChange={(next, details) => {
          if (details.reason !== "item-press") {
            setQuery(next);
          }
        }}
        itemToStringValue={(entry: CommandEntry) => entry.label}
        autoHighlight="always"
        keepHighlight
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-3 transition-colors has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/60 has-[input:focus-visible]:ring-inset">
          <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <Autocomplete.Input
            autoFocus
            spellCheck={false}
            aria-label={t("commandPalette.searchLabel")}
            placeholder={t("commandPalette.placeholder")}
            className="h-12 w-full min-w-0 bg-transparent py-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          />
        </div>

        <p role="status" className="sr-only">
          {t("commandPalette.count", { count: results.length })}
        </p>

        <Autocomplete.List
          aria-label={t("commandPalette.resultsLabel")}
          className="min-h-0 overflow-y-auto overscroll-contain p-1.5"
        >
          {(entry: CommandEntry) => (
            <Autocomplete.Item
              key={entry.id}
              value={entry}
              onClick={() => choose(entry)}
              render={(props, state) => <div {...props} aria-selected={state.highlighted} />}
              className="flex cursor-pointer flex-col gap-x-3 gap-y-0.5 rounded-md px-3 py-2 text-sm data-highlighted:bg-muted data-highlighted:text-foreground sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="line-clamp-2 min-w-0 wrap-break-word">{entry.label}</span>
              <span className="text-xs text-muted-foreground sm:shrink-0">{entry.hint}</span>
            </Autocomplete.Item>
          )}
        </Autocomplete.List>
      </Autocomplete.Root>
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
