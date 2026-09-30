import { type LinkOptions, linkOptions } from "@tanstack/react-router";
import type {
  AccountResponse,
  CategoryResponse,
  FeatureFlags,
  HouseholdResponse,
  TagResponse,
} from "@/api/generated/model";
import type { TransactionFilter } from "@/features/transactions/transaction-queries";
import type { Translate, TranslationKey } from "@/lib/i18n";
import { type RoutePath, adminNavPages, navPages } from "@/lib/navigation";
import type { FeatureKey } from "@/lib/settings";
import { type Locale, localeNames, nextLocale } from "@/stores/app-store";
import type { Theme } from "@/stores/theme-store";

export type CommandTarget =
  | { kind: "navigate"; link: LinkOptions }
  | { kind: "theme"; theme: Theme }
  | { kind: "locale"; locale: Locale }
  | { kind: "amounts" }
  | { kind: "household"; householdId: string | undefined }
  | { kind: "backup" }
  | { kind: "signOut" };

export interface CommandEntry {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  target: CommandTarget;
}

interface PageCommand {
  id: string;
  link: LinkOptions;
  labelKey: TranslationKey;
  parentKey?: TranslationKey;
  feature?: FeatureKey;
  admin?: boolean;
}

interface PageSection {
  id: string;
  link: LinkOptions;
  labelKey: TranslationKey;
}

const pageSections: Partial<Record<RoutePath, readonly PageSection[]>> = {
  "/investments": [
    {
      id: "page-tax-summary",
      link: linkOptions({ to: "/investments", search: { view: "taxSummary" } }),
      labelKey: "investments.tax.title",
    },
  ],
  "/profile": [
    {
      id: "page-trash",
      link: linkOptions({ to: "/profile", search: { section: "trash" } }),
      labelKey: "trash.title",
    },
    {
      id: "page-sessions",
      link: linkOptions({ to: "/profile", search: { section: "sessions" } }),
      labelKey: "profile.sessions.title",
    },
    {
      id: "page-two-factor",
      link: linkOptions({ to: "/profile", search: { section: "security" } }),
      labelKey: "profile.twoFactorTitle",
    },
    {
      id: "page-passkeys",
      link: linkOptions({ to: "/profile", search: { section: "security" } }),
      labelKey: "profile.passkeys.title",
    },
    {
      id: "page-notifications",
      link: linkOptions({ to: "/profile", search: { section: "notifications" } }),
      labelKey: "profile.notifications.title",
    },
    {
      id: "page-import",
      link: linkOptions({ to: "/profile", search: { section: "import" } }),
      labelKey: "profile.dataExport.navTitle",
    },
    {
      id: "page-appearance",
      link: linkOptions({ to: "/profile", search: { section: "appearance" } }),
      labelKey: "settings.appearance",
    },
  ],
  "/settings": [
    {
      id: "page-settings-features",
      link: linkOptions({ to: "/settings", search: { section: "features" } }),
      labelKey: "settings.features.title",
    },
    {
      id: "page-settings-email",
      link: linkOptions({ to: "/settings", search: { section: "email" } }),
      labelKey: "settings.smtp.title",
    },
    {
      id: "page-settings-discord",
      link: linkOptions({ to: "/settings", search: { section: "discord" } }),
      labelKey: "settings.discord.title",
    },
    {
      id: "page-settings-backups",
      link: linkOptions({ to: "/settings", search: { section: "backups" } }),
      labelKey: "backup.title",
    },
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
    {
      id: pageId(page.to),
      link: { to: page.to },
      labelKey: page.key,
      feature: page.feature,
      admin,
    },
    ...sections.map((section) => ({
      id: section.id,
      link: section.link,
      labelKey: section.labelKey,
      parentKey: page.key,
      feature: page.feature,
      admin,
    })),
  ];
}

const pageCommands: readonly PageCommand[] = [
  ...navPages.flatMap((page) => commandsFor(page, false)),
  ...adminNavPages.flatMap((page) => commandsFor(page, true)),
];

export interface CommandSources {
  t: Translate;
  features: FeatureFlags;
  isAdmin: boolean;
  theme: Theme;
  locale: Locale;
  amountsHidden: boolean;
  activeHouseholdId: string | undefined;
  accounts: readonly AccountResponse[];
  categories: readonly CategoryResponse[];
  tags: readonly TagResponse[];
  households: readonly HouseholdResponse[];
  lastMonth: string;
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
      label: t(page.labelKey),
      hint: page.parentKey ? `${goTo} · ${t(page.parentKey)}` : goTo,
      keywords: page.parentKey ? t(page.parentKey) : "",
      target: { kind: "navigate" as const, link: page.link },
    }));
}

function actionEntries(sources: CommandSources): CommandEntry[] {
  const {
    t,
    features,
    isAdmin,
    theme,
    locale,
    amountsHidden,
    activeHouseholdId,
    households,
    lastMonth,
  } = sources;
  const run = t("commandPalette.run");

  function action(
    id: string,
    label: string,
    keywords: string,
    target: CommandTarget,
    hint = run,
  ): CommandEntry {
    return { id: `action-${id}`, label, hint, keywords, target };
  }

  const entries: CommandEntry[] = [
    action("new-transaction", t("shortcuts.newTransaction"), t("nav.transactions"), {
      kind: "navigate",
      link: linkOptions({ to: "/transactions", search: { new: true } }),
    }),
    action("new-transfer", t("commandPalette.newTransfer"), t("transfers.heading"), {
      kind: "navigate",
      link: linkOptions({ to: "/accounts", search: { new: "transfer" } }),
    }),
    action("new-account", t("accounts.add"), t("nav.accounts"), {
      kind: "navigate",
      link: linkOptions({ to: "/accounts", search: { new: "account" } }),
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
    action(
      "amounts",
      t(amountsHidden ? "commandPalette.showAmounts" : "commandPalette.hideAmounts"),
      t("appearance.amounts"),
      { kind: "amounts" },
      t("appearance.amounts"),
    ),
  ];

  if (features.monthClose) {
    entries.push(
      action("close-last-month", t("commandPalette.closeLastMonth"), t("nav.monthClose"), {
        kind: "navigate",
        link: linkOptions({ to: "/", search: { month: lastMonth } }),
      }),
    );
  }

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
    search: TransactionFilter,
    keywords = "",
  ): CommandEntry {
    return {
      id: `${prefix}-${item.id}`,
      label: item.name,
      hint: `${open} · ${t(`nav.${group}`)}`,
      keywords,
      target: { kind: "navigate", link: linkOptions({ to: "/transactions", search }) },
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
