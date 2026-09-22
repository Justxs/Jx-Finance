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
  Tags,
  Target,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/hooks/use-settings";
import type { TranslationKey } from "@/lib/i18n";

export type RoutePath = NonNullable<LinkProps["to"]>;

interface NavPage {
  to: RoutePath;
  key: TranslationKey;
  icon: LucideIcon;
  group: "ledger" | "plan" | "review" | "manage";
  feature?: FeatureKey;
  shortcut?: string;
}

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
  { to: "/categories", key: "nav.categories", icon: Tags, group: "ledger", shortcut: "c" },
  { to: "/tags", key: "nav.tags", icon: Bookmark, group: "ledger" },
  {
    to: "/categorization-rules",
    key: "nav.categorizationRules",
    icon: ListChecks,
    group: "ledger",
    feature: "categorizationRules",
    shortcut: "u",
  },
  {
    to: "/budgets",
    key: "nav.budgets",
    icon: PiggyBank,
    group: "plan",
    feature: "budgets",
    shortcut: "b",
  },
  { to: "/goals", key: "nav.goals", icon: Target, group: "plan", feature: "goals", shortcut: "o" },
  {
    to: "/recurring-bills",
    key: "nav.recurringBills",
    icon: CalendarClock,
    group: "plan",
    feature: "recurringBills",
    shortcut: "l",
  },
  {
    to: "/net-worth",
    key: "nav.netWorth",
    icon: Scale,
    group: "review",
    feature: "netWorth",
    shortcut: "w",
  },
  {
    to: "/investments",
    key: "nav.investments",
    icon: ChartCandlestick,
    group: "review",
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
  {
    to: "/households",
    key: "nav.households",
    icon: House,
    group: "manage",
    feature: "households",
    shortcut: "h",
  },
] as const satisfies readonly NavPage[];

export const adminNavPages = [
  { to: "/users", key: "nav.users", icon: Users, group: "manage" },
  { to: "/settings", key: "nav.settings", icon: Settings, group: "manage" },
] as const satisfies readonly NavPage[];

export const profileNavPage = { to: "/profile", key: "nav.profile" } as const;
