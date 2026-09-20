import { expect, test } from "vitest";
import type { FeatureFlags } from "@/api/generated/model";
import { shortcuts } from "@/lib/shortcuts";
import { settingsFixture } from "@/test/settings";
import { visibleNav } from "./app-sidebar";

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
  expect(paths(allOff, false)).toEqual(["/", "/transactions", "/accounts", "/categories"]);
});

test("each feature flag adds its page", () => {
  expect(paths({ ...allOff, budgets: true, investments: true }, false)).toEqual([
    "/",
    "/transactions",
    "/accounts",
    "/categories",
    "/budgets",
    "/investments",
  ]);
  expect(paths(allOn, false)).toHaveLength(11);
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
