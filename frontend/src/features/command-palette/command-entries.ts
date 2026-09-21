import type {
  AccountResponse,
  CategoryResponse,
  FeatureFlags,
  HouseholdResponse,
  TagResponse,
} from "@/api/generated/model";
import type { Translate, TranslationKey } from "@/lib/i18n";

export const commandGroups = ["actions", "pages", "accounts", "categories", "tags"] as const;

export type CommandGroup = (typeof commandGroups)[number];

export type CommandTheme = "light" | "dark";

export type CommandLocale = "en" | "lt";

export type CommandTarget =
  | { kind: "navigate"; to: string; search?: Record<string, unknown> }
  | { kind: "theme"; theme: CommandTheme }
  | { kind: "locale"; locale: CommandLocale }
  | { kind: "household"; householdId: string | undefined }
  | { kind: "backup" }
  | { kind: "signOut" };

export interface CommandEntry {
  id: string;
  group: CommandGroup;
  label: string;
  hint: string;
  keywords: string;
  target: CommandTarget;
}

type FeatureKey = keyof FeatureFlags;

interface PageCommand {
  id: string;
  to: string;
  search?: Record<string, unknown>;
  labelKey: TranslationKey;
  parentKey?: TranslationKey;
  feature?: FeatureKey;
  admin?: boolean;
}

const pageCommands: readonly PageCommand[] = [
  { id: "page-dashboard", to: "/", labelKey: "nav.dashboard" },
  { id: "page-transactions", to: "/transactions", labelKey: "nav.transactions" },
  { id: "page-accounts", to: "/accounts", labelKey: "nav.accounts" },
  { id: "page-categories", to: "/categories", labelKey: "nav.categories" },
  { id: "page-tags", to: "/tags", labelKey: "nav.tags" },
  {
    id: "page-categorization-rules",
    to: "/categorization-rules",
    labelKey: "nav.categorizationRules",
    feature: "categorizationRules",
  },
  { id: "page-budgets", to: "/budgets", labelKey: "nav.budgets", feature: "budgets" },
  { id: "page-goals", to: "/goals", labelKey: "nav.goals", feature: "goals" },
  {
    id: "page-recurring-bills",
    to: "/recurring-bills",
    labelKey: "nav.recurringBills",
    feature: "recurringBills",
  },
  { id: "page-net-worth", to: "/net-worth", labelKey: "nav.netWorth", feature: "netWorth" },
  {
    id: "page-investments",
    to: "/investments",
    labelKey: "nav.investments",
    feature: "investments",
  },
  {
    id: "page-tax-summary",
    to: "/investments",
    search: { view: "taxSummary" },
    labelKey: "investments.tax.title",
    parentKey: "nav.investments",
    feature: "investments",
  },
  { id: "page-reports", to: "/reports", labelKey: "nav.reports", feature: "reports" },
  { id: "page-households", to: "/households", labelKey: "nav.households", feature: "households" },
  { id: "page-profile", to: "/profile", labelKey: "nav.profile" },
  {
    id: "page-trash",
    to: "/profile",
    search: { section: "trash" },
    labelKey: "trash.title",
    parentKey: "nav.profile",
  },
  {
    id: "page-sessions",
    to: "/profile",
    search: { section: "sessions" },
    labelKey: "profile.sessions.title",
    parentKey: "nav.profile",
  },
  {
    id: "page-two-factor",
    to: "/profile",
    search: { section: "security" },
    labelKey: "profile.twoFactorTitle",
    parentKey: "nav.profile",
  },
  {
    id: "page-import",
    to: "/profile",
    search: { section: "import" },
    labelKey: "imports.sectionTitle",
    parentKey: "nav.profile",
    feature: "import",
  },
  {
    id: "page-appearance",
    to: "/profile",
    search: { section: "appearance" },
    labelKey: "settings.appearance",
    parentKey: "nav.profile",
  },
  { id: "page-users", to: "/users", labelKey: "nav.users", admin: true },
  { id: "page-settings", to: "/settings", labelKey: "nav.settings", admin: true },
  {
    id: "page-settings-features",
    to: "/settings",
    search: { section: "features" },
    labelKey: "settings.features.title",
    parentKey: "nav.settings",
    admin: true,
  },
  {
    id: "page-settings-email",
    to: "/settings",
    search: { section: "email" },
    labelKey: "settings.smtp.title",
    parentKey: "nav.settings",
    admin: true,
  },
  {
    id: "page-settings-backups",
    to: "/settings",
    search: { section: "backups" },
    labelKey: "backup.title",
    parentKey: "nav.settings",
    admin: true,
  },
];

const localeNames: Record<CommandLocale, string> = { en: "English", lt: "Lietuvių" };

const otherLocale: Record<CommandLocale, CommandLocale> = { en: "lt", lt: "en" };

export interface CommandSources {
  t: Translate;
  features: FeatureFlags;
  isAdmin: boolean;
  theme: CommandTheme;
  locale: CommandLocale;
  activeHouseholdId: string | undefined;
  accounts: readonly AccountResponse[];
  categories: readonly CategoryResponse[];
  tags: readonly TagResponse[];
  households: readonly HouseholdResponse[];
}

function isAllowed(page: PageCommand, features: FeatureFlags, isAdmin: boolean) {
  if (page.admin === true && !isAdmin) {
    return false;
  }
  return page.feature === undefined || features[page.feature];
}

function pageEntries({ t, features, isAdmin }: CommandSources): CommandEntry[] {
  const goTo = t("commandPalette.goTo");

  return pageCommands
    .filter((page) => isAllowed(page, features, isAdmin))
    .map((page) => ({
      id: page.id,
      group: "pages" as const,
      label: t(page.labelKey),
      hint: page.parentKey ? `${goTo} · ${t(page.parentKey)}` : goTo,
      keywords: page.parentKey ? t(page.parentKey) : "",
      target: { kind: "navigate" as const, to: page.to, search: page.search },
    }));
}

function actionEntries(sources: CommandSources): CommandEntry[] {
  const { t, features, isAdmin, theme, locale, activeHouseholdId, households } = sources;
  const run = t("commandPalette.run");

  const entries: CommandEntry[] = [
    {
      id: "action-new-transaction",
      group: "actions",
      label: t("shortcuts.newTransaction"),
      hint: run,
      keywords: t("nav.transactions"),
      target: { kind: "navigate", to: "/transactions", search: { new: true } },
    },
    {
      id: "action-new-transfer",
      group: "actions",
      label: t("commandPalette.newTransfer"),
      hint: run,
      keywords: t("transfers.heading"),
      target: { kind: "navigate", to: "/accounts", search: { new: "transfer" } },
    },
    {
      id: "action-new-account",
      group: "actions",
      label: t("accounts.add"),
      hint: run,
      keywords: t("nav.accounts"),
      target: { kind: "navigate", to: "/accounts", search: { new: "account" } },
    },
    {
      id: "action-theme",
      group: "actions",
      label: t(theme === "dark" ? "commandPalette.theme.light" : "commandPalette.theme.dark"),
      hint: t("theme.toggle"),
      keywords: t("theme.toggle"),
      target: { kind: "theme", theme: theme === "dark" ? "light" : "dark" },
    },
    {
      id: "action-locale",
      group: "actions",
      label: localeNames[otherLocale[locale]],
      hint: t("commandPalette.language"),
      keywords: t("commandPalette.language"),
      target: { kind: "locale", locale: otherLocale[locale] },
    },
  ];

  if (isAdmin) {
    entries.push({
      id: "action-backup",
      group: "actions",
      label: t("backup.create"),
      hint: run,
      keywords: t("backup.title"),
      target: { kind: "backup" },
    });
  }

  if (features.households && households.length > 0) {
    const scope = t("households.scope.label");
    if (activeHouseholdId !== undefined) {
      entries.push({
        id: "action-household-everything",
        group: "actions",
        label: t("households.scope.everything"),
        hint: scope,
        keywords: scope,
        target: { kind: "household", householdId: undefined },
      });
    }
    for (const household of households) {
      if (household.id !== activeHouseholdId) {
        entries.push({
          id: `action-household-${household.id}`,
          group: "actions",
          label: household.name,
          hint: scope,
          keywords: scope,
          target: { kind: "household", householdId: household.id },
        });
      }
    }
  }

  entries.push({
    id: "action-sign-out",
    group: "actions",
    label: t("auth.logout"),
    hint: run,
    keywords: "",
    target: { kind: "signOut" },
  });

  return entries;
}

function recordEntries({ t, accounts, categories, tags }: CommandSources): CommandEntry[] {
  const open = t("commandPalette.openTransactions");

  return [
    ...accounts.map((account) => ({
      id: `account-${account.id}`,
      group: "accounts" as const,
      label: account.name,
      hint: `${open} · ${t("nav.accounts")}`,
      keywords: account.iban ?? "",
      target: {
        kind: "navigate" as const,
        to: "/transactions",
        search: { accountId: account.id },
      },
    })),
    ...categories.map((category) => ({
      id: `category-${category.id}`,
      group: "categories" as const,
      label: category.name,
      hint: `${open} · ${t("nav.categories")}`,
      keywords: "",
      target: {
        kind: "navigate" as const,
        to: "/transactions",
        search: { categoryId: category.id },
      },
    })),
    ...tags.map((tag) => ({
      id: `tag-${tag.id}`,
      group: "tags" as const,
      label: tag.name,
      hint: `${open} · ${t("nav.tags")}`,
      keywords: "",
      target: { kind: "navigate" as const, to: "/transactions", search: { tagIds: tag.id } },
    })),
  ];
}

export function buildCommandEntries(sources: CommandSources): CommandEntry[] {
  return [...actionEntries(sources), ...pageEntries(sources), ...recordEntries(sources)];
}

export function foldText(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const EXACT = 0;
const PREFIX = 1;
const WORD_PREFIX = 2;
const SUBSTRING = 3;
const SUBSEQUENCE = 4;
const KEYWORD_PENALTY = 10;

function isSubsequence(folded: string, wanted: string) {
  let index = 0;
  for (const letter of folded) {
    if (letter === wanted[index]) {
      index += 1;
      if (index === wanted.length) {
        return true;
      }
    }
  }
  return false;
}

export function matchScore(text: string, query: string): number | null {
  const folded = foldText(text);
  const wanted = foldText(query);

  if (wanted.length === 0 || folded === wanted) {
    return EXACT;
  }
  if (folded.startsWith(wanted)) {
    return PREFIX;
  }
  if (folded.split(/[^\p{Letter}\p{Number}]+/u).some((word) => word.startsWith(wanted))) {
    return WORD_PREFIX;
  }
  if (folded.includes(wanted)) {
    return SUBSTRING;
  }
  return isSubsequence(folded, wanted) ? SUBSEQUENCE : null;
}

function entryScore(entry: CommandEntry, query: string): number | null {
  const label = matchScore(entry.label, query);
  if (label !== null) {
    return label;
  }
  if (entry.keywords === "") {
    return null;
  }
  const keyword = matchScore(entry.keywords, query);
  return keyword === null ? null : keyword + KEYWORD_PENALTY;
}

interface Ranked {
  entry: CommandEntry;
  score: number;
  recent: number;
  order: number;
}

function compareRanked(left: Ranked, right: Ranked) {
  return left.score - right.score || left.recent - right.recent || left.order - right.order;
}

export function filterCommandEntries(
  entries: readonly CommandEntry[],
  query: string,
  recents: readonly string[] = [],
): CommandEntry[] {
  const trimmed = query.trim();
  const ranked: Ranked[] = [];

  for (const [order, entry] of entries.entries()) {
    const score = entryScore(entry, trimmed);
    if (score !== null) {
      const recent = recents.indexOf(entry.id);
      ranked.push({ entry, score, recent: recent === -1 ? recents.length : recent, order });
    }
  }

  return ranked.toSorted(compareRanked).map((row) => row.entry);
}
