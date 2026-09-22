import type {
  AccountResponse,
  CategoryResponse,
  FeatureFlags,
  HouseholdResponse,
  TagResponse,
} from "@/api/generated/model";
import type { FeatureKey } from "@/hooks/use-settings";
import type { Translate, TranslationKey } from "@/lib/i18n";
import { type RoutePath, adminNavPages, navPages, profileNavPage } from "@/lib/navigation";
import { type Locale, localeNames, nextLocale } from "@/stores/app-store";
import type { Theme } from "@/stores/theme-store";

export const commandGroups = ["actions", "pages", "accounts", "categories", "tags"] as const;

export type CommandGroup = (typeof commandGroups)[number];

export type CommandTarget =
  | { kind: "navigate"; to: RoutePath; search?: Record<string, unknown> }
  | { kind: "theme"; theme: Theme }
  | { kind: "locale"; locale: Locale }
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

interface PageCommand {
  id: string;
  to: RoutePath;
  search?: Record<string, unknown>;
  labelKey: TranslationKey;
  parentKey?: TranslationKey;
  feature?: FeatureKey;
  admin?: boolean;
}

interface PageSection {
  id: string;
  search: Record<string, unknown>;
  labelKey: TranslationKey;
  feature?: FeatureKey;
}

const pageSections: Partial<Record<RoutePath, readonly PageSection[]>> = {
  "/investments": [
    { id: "page-tax-summary", search: { view: "taxSummary" }, labelKey: "investments.tax.title" },
  ],
  "/profile": [
    { id: "page-trash", search: { section: "trash" }, labelKey: "trash.title" },
    { id: "page-sessions", search: { section: "sessions" }, labelKey: "profile.sessions.title" },
    { id: "page-two-factor", search: { section: "security" }, labelKey: "profile.twoFactorTitle" },
    {
      id: "page-import",
      search: { section: "import" },
      labelKey: "imports.sectionTitle",
      feature: "import",
    },
    { id: "page-appearance", search: { section: "appearance" }, labelKey: "settings.appearance" },
  ],
  "/settings": [
    {
      id: "page-settings-features",
      search: { section: "features" },
      labelKey: "settings.features.title",
    },
    { id: "page-settings-email", search: { section: "email" }, labelKey: "settings.smtp.title" },
    { id: "page-settings-backups", search: { section: "backups" }, labelKey: "backup.title" },
  ],
};

interface NavPage {
  to: RoutePath;
  key: TranslationKey;
  feature?: FeatureKey;
}

function pageId(to: RoutePath) {
  return `page-${to === "/" ? "dashboard" : to.slice(1)}`;
}

function commandsFor(page: NavPage, admin: boolean): PageCommand[] {
  const sections = pageSections[page.to] ?? [];

  return [
    { id: pageId(page.to), to: page.to, labelKey: page.key, feature: page.feature, admin },
    ...sections.map((section) => ({
      id: section.id,
      to: page.to,
      search: section.search,
      labelKey: section.labelKey,
      parentKey: page.key,
      feature: section.feature ?? page.feature,
      admin,
    })),
  ];
}

const pageCommands: readonly PageCommand[] = [
  ...navPages.flatMap((page) => commandsFor(page, false)),
  ...commandsFor(profileNavPage, false),
  ...adminNavPages.flatMap((page) => commandsFor(page, true)),
];

export interface CommandSources {
  t: Translate;
  features: FeatureFlags;
  isAdmin: boolean;
  theme: Theme;
  locale: Locale;
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
      label: localeNames[nextLocale[locale]],
      hint: t("commandPalette.language"),
      keywords: t("commandPalette.language"),
      target: { kind: "locale", locale: nextLocale[locale] },
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
    ...accounts.map((account): CommandEntry => ({
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
    ...categories.map((category): CommandEntry => ({
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
    ...tags.map((tag): CommandEntry => ({
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
