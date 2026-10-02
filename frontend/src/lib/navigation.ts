import type { LinkProps } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Bookmark,
  CalendarClock,
  ChartCandlestick,
  FileBarChart,
  House,
  LayoutDashboard,
  ListChecks,
  PiggyBank,
  Scale,
  Settings,
  Settings2,
  Tags,
  Target,
  UserRound,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { FeatureFlags } from "@/api/generated/model";
import type { TranslationKey } from "@/lib/i18n";
import type { FeatureKey } from "@/lib/settings";

export type RoutePath = NonNullable<LinkProps["to"]>;

export type NavHub = "categories" | "plan" | "wealth" | "settings";

interface NavPage {
  to: RoutePath;
  key: TranslationKey;
  icon: LucideIcon;
  group: "ledger" | "plan" | "review" | "manage";
  hub?: NavHub;
  feature?: FeatureKey;
  shortcut?: string;
}

interface NavHubEntry {
  key: TranslationKey;
  icon: LucideIcon;
  tabs: boolean;
}

export const navHubs = {
  categories: { key: "nav.categories", icon: Tags, tabs: true },
  plan: { key: "nav.plan", icon: PiggyBank, tabs: true },
  wealth: { key: "nav.wealth", icon: Scale, tabs: true },
  settings: { key: "nav.settings", icon: Settings, tabs: false },
} as const satisfies Record<NavHub, NavHubEntry>;

export const PUBLIC_PATHS: ReadonlySet<string> = new Set<RoutePath>([
  "/login",
  "/setup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

export const navPages = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard, group: "ledger", shortcut: "d" },
  {
    to: "/transactions",
    key: "nav.transactions",
    icon: ArrowLeftRight,
    group: "ledger",
    shortcut: "t",
  },
  { to: "/accounts", key: "nav.accounts", icon: WalletCards, group: "ledger", shortcut: "a" },
  {
    to: "/categories",
    key: "nav.categories",
    icon: Tags,
    group: "ledger",
    hub: "categories",
    shortcut: "c",
  },
  { to: "/tags", key: "nav.tags", icon: Bookmark, group: "ledger", hub: "categories" },
  {
    to: "/categorization-rules",
    key: "nav.categorizationRules",
    icon: ListChecks,
    group: "ledger",
    hub: "categories",
    feature: "categorizationRules",
    shortcut: "u",
  },
  {
    to: "/budgets",
    key: "nav.budgets",
    icon: PiggyBank,
    group: "plan",
    hub: "plan",
    feature: "budgets",
    shortcut: "b",
  },
  {
    to: "/goals",
    key: "nav.goals",
    icon: Target,
    group: "plan",
    hub: "plan",
    feature: "goals",
    shortcut: "o",
  },
  {
    to: "/recurring-bills",
    key: "nav.recurringBills",
    icon: CalendarClock,
    group: "plan",
    hub: "plan",
    feature: "recurringBills",
    shortcut: "l",
  },
  {
    to: "/net-worth",
    key: "nav.netWorth",
    icon: Scale,
    group: "review",
    hub: "wealth",
    feature: "netWorth",
    shortcut: "w",
  },
  {
    to: "/investments",
    key: "nav.investments",
    icon: ChartCandlestick,
    group: "review",
    hub: "wealth",
    feature: "investments",
    shortcut: "v",
  },
  {
    to: "/reports",
    key: "nav.reports",
    icon: FileBarChart,
    group: "review",
    feature: "reports",
    shortcut: "r",
  },
  { to: "/profile", key: "nav.profile", icon: UserRound, group: "manage", hub: "settings" },
  {
    to: "/households",
    key: "nav.households",
    icon: House,
    group: "manage",
    hub: "settings",
    feature: "households",
    shortcut: "h",
  },
] as const satisfies readonly NavPage[];

export const adminNavPages = [
  { to: "/users", key: "nav.users", icon: Users, group: "manage", hub: "settings" },
  {
    to: "/settings",
    key: "nav.installation",
    icon: Settings2,
    group: "manage",
    hub: "settings",
  },
] as const satisfies readonly NavPage[];

export type NavItem = (typeof navPages)[number] | (typeof adminNavPages)[number];

export interface NavEntry {
  to: NavItem["to"];
  key: TranslationKey;
  icon: LucideIcon;
  group: NavItem["group"];
  hub: NavHub | undefined;
  pages: NavItem[];
}

export function isPageEnabled(page: NavItem, features: FeatureFlags) {
  return !("feature" in page) || features[page.feature];
}

export function visibleNav(features: FeatureFlags, isAdmin: boolean): readonly NavItem[] {
  const enabled = navPages.filter((page) => isPageEnabled(page, features));
  return isAdmin ? [...enabled, ...adminNavPages] : enabled;
}

export function navEntries(pages: readonly NavItem[]): NavEntry[] {
  const entries: NavEntry[] = [];
  for (const page of pages) {
    const hub = "hub" in page ? page.hub : undefined;
    const existing = hub ? entries.find((entry) => entry.hub === hub) : undefined;
    if (existing) {
      existing.pages.push(page);
      continue;
    }
    entries.push({
      to: page.to,
      key: hub ? navHubs[hub].key : page.key,
      icon: hub ? navHubs[hub].icon : page.icon,
      group: page.group,
      hub,
      pages: [page],
    });
  }
  return entries.map((entry) => {
    const [only] = entry.pages;
    return entry.hub && navHubs[entry.hub].tabs && only && entry.pages.length === 1
      ? { ...entry, key: only.key, icon: only.icon }
      : entry;
  });
}

export function isEntryActive(entry: NavEntry, pathname: string) {
  return entry.pages.some((page) => isPathIn(pathname, page.to));
}

function isPathIn(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

export const sidebarRowClass =
  "flex items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring";
