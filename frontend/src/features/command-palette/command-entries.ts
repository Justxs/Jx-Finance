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

const commandGroups = ["actions", "pages", "accounts", "categories", "tags"] as const;

type CommandGroup = (typeof commandGroups)[number];

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

  function action(
    id: string,
    label: string,
    keywords: string,
    target: CommandTarget,
    hint = run,
  ): CommandEntry {
    return { id: `action-${id}`, group: "actions", label, hint, keywords, target };
  }

  const entries: CommandEntry[] = [
    action("new-transaction", t("shortcuts.newTransaction"), t("nav.transactions"), {
      kind: "navigate",
      to: "/transactions",
      search: { new: true },
    }),
    action("new-transfer", t("commandPalette.newTransfer"), t("transfers.heading"), {
      kind: "navigate",
      to: "/accounts",
      search: { new: "transfer" },
    }),
    action("new-account", t("accounts.add"), t("nav.accounts"), {
      kind: "navigate",
      to: "/accounts",
      search: { new: "account" },
    }),
    action(
      "theme",
      t(theme === "dark" ? "commandPalette.theme.light" : "commandPalette.theme.dark"),
      t("theme.toggle"),
      { kind: "theme", theme: theme === "dark" ? "light" : "dark" },
      t("theme.toggle"),
    ),
    action(
      "locale",
      localeNames[nextLocale[locale]],
      t("commandPalette.language"),
      { kind: "locale", locale: nextLocale[locale] },
      t("commandPalette.language"),
    ),
  ];

  if (isAdmin) {
    entries.push(action("backup", t("backup.create"), t("backup.title"), { kind: "backup" }));
  }

  if (features.households && households.length > 0) {
    const scope = t("households.scope.label");
    if (activeHouseholdId !== undefined) {
      entries.push(
        action(
          "household-everything",
          t("households.scope.everything"),
          scope,
          { kind: "household", householdId: undefined },
          scope,
        ),
      );
    }
    for (const household of households) {
      if (household.id !== activeHouseholdId) {
        entries.push(
          action(
            `household-${household.id}`,
            household.name,
            scope,
            { kind: "household", householdId: household.id },
            scope,
          ),
        );
      }
    }
  }

  entries.push(action("sign-out", t("auth.logout"), "", { kind: "signOut" }));

  return entries;
}

type RecordGroup = "accounts" | "categories" | "tags";

function recordEntries({ t, accounts, categories, tags }: CommandSources): CommandEntry[] {
  const open = t("commandPalette.openTransactions");

  function record(
    group: RecordGroup,
    prefix: string,
    item: { id: string; name: string },
    search: Record<string, unknown>,
    keywords = "",
  ): CommandEntry {
    return {
      id: `${prefix}-${item.id}`,
      group,
      label: item.name,
      hint: `${open} · ${t(`nav.${group}`)}`,
      keywords,
      target: { kind: "navigate", to: "/transactions", search },
    };
  }

  return [
    ...accounts.map((account) =>
      record("accounts", "account", account, { accountId: account.id }, account.iban ?? ""),
    ),
    ...categories.map((category) =>
      record("categories", "category", category, { categoryId: category.id }),
    ),
    ...tags.map((tag) => record("tags", "tag", tag, { tagIds: tag.id })),
  ];
}

export function buildCommandEntries(sources: CommandSources): CommandEntry[] {
  return [...actionEntries(sources), ...pageEntries(sources), ...recordEntries(sources)];
}
