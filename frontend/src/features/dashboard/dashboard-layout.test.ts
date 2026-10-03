import { describe, expect, test } from "vitest";
import { DashboardCard, type FeatureFlags } from "@/api/generated/model";
import { settingsFixture } from "@/test/settings";
import { type LayoutDraft, moveCard, setCardShown, shownCards } from "./dashboard-layout";

const allOn: FeatureFlags = {
  ...settingsFixture().features,
  budgets: true,
  goals: true,
  netWorth: true,
  recurringBills: true,
  reports: true,
};

const draft: LayoutDraft = { order: Object.values(DashboardCard), hidden: [] };

describe("shownCards", () => {
  test("keeps the saved order and leaves out hidden cards", () => {
    expect(shownCards({ order: ["accounts", "summary"], hidden: ["summary"] }, allOn)).toEqual([
      "accounts",
    ]);
  });

  test("leaves out cards whose feature is switched off", () => {
    const shown = shownCards(draft, { ...allOn, budgets: false, reports: false });

    expect(shown).not.toContain("budgets");
    expect(shown).not.toContain("spendingPace");
    expect(shown).toContain("summary");
  });

  test("leaves out the upcoming bills while recurring entries are off and keeps the cash flow", () => {
    const shown = shownCards(draft, { ...allOn, recurringBills: false });

    expect(shown).not.toContain("upcomingBills");
    expect(shown).toContain("cashFlow");
  });

  test("leaves out the cash-flow card while the forecast is off", () => {
    expect(shownCards(draft, { ...allOn, cashFlowForecast: false })).not.toContain("cashFlow");
    expect(shownCards(draft, allOn).at(-2)).toBe("cashFlow");
  });

  test("leaves out the goals card while goals are off", () => {
    expect(shownCards(draft, { ...allOn, goals: false })).not.toContain("goals");
    expect(shownCards(draft, allOn).at(-1)).toBe("goals");
  });
});

describe("moveCard", () => {
  test("swaps a card with its neighbour", () => {
    expect(moveCard(draft, "monthlyTrend", "up", allOn).order.slice(0, 2)).toEqual([
      "monthlyTrend",
      "summary",
    ]);
  });

  test("steps over a card whose feature is off and keeps that card in place", () => {
    const moved = moveCard(draft, "netWorth", "up", { ...allOn, budgets: false });

    expect(moved.order.indexOf("netWorth")).toBe(3);
    expect(moved.order.indexOf("budgets")).toBe(4);
    expect(moved.order.indexOf("spendingPace")).toBe(5);
  });

  test("leaves the first card where it is when moved up", () => {
    expect(moveCard(draft, "summary", "up", allOn)).toBe(draft);
  });
});

describe("setCardShown", () => {
  test("hides and shows a card once", () => {
    const hidden = setCardShown(setCardShown(draft, "budgets", false), "budgets", false);

    expect(hidden.hidden).toEqual(["budgets"]);
    expect(setCardShown(hidden, "budgets", true).hidden).toEqual([]);
  });
});
