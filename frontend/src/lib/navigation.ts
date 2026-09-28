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
import type { FeatureKey } from "@/hooks/use-settings";
import type { TranslationKey } from "@/lib/i18n";

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

export function isPathIn(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}
