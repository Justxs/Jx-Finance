import { expect, test } from "vitest";
import type { FeatureFlags } from "@/api/generated/model";
import { settingsFixture } from "@/test/settings";
import { navEntries, visibleNav } from "./navigation";
import { shortcuts } from "./shortcuts";

const baseFlags = settingsFixture().features;

function isFeature(name: string): name is keyof FeatureFlags {
  return name in baseFlags;
}

const featureNames = Object.keys(baseFlags).filter(isFeature);

function flagsSetTo(value: boolean): FeatureFlags {
  const flags = { ...baseFlags };
  for (const feature of featureNames) {
    flags[feature] = value;
  }
  return flags;
}

const allOn = flagsSetTo(true);

const allOff = flagsSetTo(false);

function paths(features: FeatureFlags, isAdmin: boolean) {
  return visibleNav(features, isAdmin).map((item) => item.to);
}

test("the core ledger pages are always there", () => {
  expect(paths(allOff, false)).toEqual([
    "/",
    "/transactions",
    "/accounts",
    "/categories",
    "/tags",
    "/profile",
  ]);
});

test("each feature flag adds its page", () => {
  expect(paths({ ...allOff, budgets: true, investments: true }, false)).toEqual([
    "/",
    "/transactions",
    "/accounts",
    "/categories",
    "/tags",
    "/budgets",
    "/investments",
    "/profile",
  ]);
  expect(paths(allOn, false)).toHaveLength(14);
});

test("multi-currency has no page of its own", () => {
  expect(paths({ ...allOff, multiCurrency: true }, false)).toEqual(paths(allOff, false));
});

test("only admins get users and settings", () => {
  expect(paths(allOn, false)).not.toContain("/users");
  expect(paths(allOff, true).slice(-2)).toEqual(["/users", "/settings"]);
});

test("every go-to shortcut lands on a page the sidebar can show", () => {
  const navigable = new Set<string>(paths(allOn, true));
  const targets = shortcuts
    .filter((shortcut) => shortcut.group === "goTo")
    .map((shortcut) => (shortcut.action.type === "navigate" ? shortcut.action.to : ""));

  expect(targets.filter((to) => !navigable.has(to))).toEqual([]);
});

test("shortcuts and sidebar gate pages on the same feature", () => {
  for (const feature of featureNames) {
    const hidden = new Set<string>(paths(allOn, true));
    for (const to of paths({ ...allOn, [feature]: false }, true)) {
      hidden.delete(to);
    }
    const gated = shortcuts
      .filter((shortcut) => shortcut.feature === feature && shortcut.action.type === "navigate")
      .map((shortcut) => (shortcut.action.type === "navigate" ? shortcut.action.to : ""));

    expect(gated).toEqual([...hidden]);
  }
});

function entryKeys(features: FeatureFlags, isAdmin: boolean) {
  return navEntries(visibleNav(features, isAdmin)).map((entry) => entry.key);
}

test("sibling pages share one sidebar link", () => {
  expect(entryKeys(allOn, true)).toEqual([
    "nav.dashboard",
    "nav.transactions",
    "nav.accounts",
    "nav.categories",
    "nav.plan",
    "nav.wealth",
    "nav.reports",
    "nav.settings",
  ]);
});

test("a hub with one page left shows that page's own name", () => {
  expect(entryKeys({ ...allOff, budgets: true }, false)).toContain("nav.budgets");
  expect(entryKeys({ ...allOff, budgets: true }, false)).not.toContain("nav.plan");
});

test("settings keeps its name for a member with only the personal pages", () => {
  expect(entryKeys(allOff, false).at(-1)).toBe("nav.settings");
});
