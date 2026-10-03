import { describe, expect, test } from "vitest";
import { settingsWith } from "@/storybook/fixtures";
import { applyPreset, matchingPreset } from "./feature-presets";

const optedIn = settingsWith({
  features: { apiTokens: true, locations: true, learnedCategories: false },
}).features;

describe("applyPreset", () => {
  test("track spending keeps the ledger features and turns planning off", () => {
    const applied = applyPreset(optedIn, "track");

    expect(applied.import).toBe(true);
    expect(applied.reports).toBe(true);
    expect(applied.budgets).toBe(false);
    expect(applied.investments).toBe(false);
  });

  test("running the household adds planning and sharing but not investments", () => {
    const applied = applyPreset(optedIn, "household");

    expect(applied.budgets).toBe(true);
    expect(applied.households).toBe(true);
    expect(applied.monthClose).toBe(true);
    expect(applied.investments).toBe(false);
    expect(applied.multiCurrency).toBe(false);
  });

  test("no preset touches the opt-in features", () => {
    for (const preset of ["track", "household", "everything"] as const) {
      const applied = applyPreset(optedIn, preset);

      expect(applied.apiTokens).toBe(true);
      expect(applied.locations).toBe(true);
      expect(applied.learnedCategories).toBe(false);
    }
  });
});

describe("matchingPreset", () => {
  test("names the preset the flags were made from", () => {
    expect(matchingPreset(applyPreset(optedIn, "household"))).toBe("household");
    expect(matchingPreset(applyPreset(optedIn, "everything"))).toBe("everything");
  });

  test("names none once a feature is changed by hand", () => {
    const changed = { ...applyPreset(optedIn, "track"), goals: true };

    expect(matchingPreset(changed)).toBeUndefined();
  });
});
