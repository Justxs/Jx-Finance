import { describe, expect, test } from "vitest";
import {
  accounts,
  categories,
  checkingAccount,
  familyHousehold,
  households,
  ids as fixtureIds,
  settings,
  tags,
} from "@/storybook/fixtures";
import { type CommandEntry, type CommandSources, buildCommandEntries } from "./command-entries";
import { filterCommandEntries, foldText, matchScore } from "./command-search";

function t(key: string) {
  return key;
}

const allFeatures = settings.features;
const accountEntry = `account-${checkingAccount.id}`;
const categoryEntry = `category-${fixtureIds.categories.food}`;
const tagEntry = `tag-${fixtureIds.tags.holiday}`;
const familyEntry = `action-household-${familyHousehold.id}`;

function sources(overrides: Partial<CommandSources> = {}): CommandSources {
  return {
    t,
    features: allFeatures,
    isAdmin: false,
    theme: "light",
    locale: "en",
    activeHouseholdId: undefined,
    accounts,
    categories,
    tags,
    households,
    ...overrides,
  };
}

function ids(entries: readonly CommandEntry[]) {
  return entries.map((entry) => entry.id);
}

describe("buildCommandEntries", () => {
  test("offers every page, record and action a member may reach", () => {
    const entries = ids(buildCommandEntries(sources()));

    expect(entries).toEqual(
      expect.arrayContaining([
        "page-dashboard",
        "page-tags",
        "page-categorization-rules",
        "page-trash",
        "page-tax-summary",
        "action-new-transaction",
        "action-new-transfer",
        "action-new-account",
        "action-theme",
        "action-locale",
        "action-sign-out",
        accountEntry,
        categoryEntry,
        tagEntry,
      ]),
    );
  });

  test("a member is offered neither the administrator pages nor a backup", () => {
    const entries = ids(buildCommandEntries(sources()));

    expect(entries).not.toContain("page-users");
    expect(entries).not.toContain("page-settings");
    expect(entries).not.toContain("page-settings-email");
    expect(entries).not.toContain("page-settings-backups");
    expect(entries).not.toContain("action-backup");
  });

  test("an administrator is offered them, the email section included", () => {
    const entries = ids(buildCommandEntries(sources({ isAdmin: true })));

    expect(entries).toEqual(
      expect.arrayContaining([
        "page-users",
        "page-settings",
        "page-settings-features",
        "page-settings-email",
        "page-settings-backups",
        "action-backup",
      ]),
    );
  });

  test("a switched-off feature takes its pages away", () => {
    const entries = ids(
      buildCommandEntries(
        sources({
          features: {
            ...allFeatures,
            investments: false,
            categorizationRules: false,
            import: false,
          },
        }),
      ),
    );

    expect(entries).not.toContain("page-investments");
    expect(entries).not.toContain("page-tax-summary");
    expect(entries).not.toContain("page-categorization-rules");
    expect(entries).not.toContain("page-import");
    expect(entries).toContain("page-transactions");
  });

  test("household switching is offered only while the feature is on and memberships exist", () => {
    const off = ids(
      buildCommandEntries(sources({ features: { ...allFeatures, households: false } })),
    );
    expect(off).not.toContain(familyEntry);

    const none = ids(buildCommandEntries(sources({ households: [] })));
    expect(none).not.toContain("action-household-everything");

    const active = ids(buildCommandEntries(sources({ activeHouseholdId: familyHousehold.id })));
    expect(active).toContain("action-household-everything");
    expect(active).not.toContain(familyEntry);
  });

  test("the theme and language entries name the choice they would make", () => {
    const light = buildCommandEntries(sources());
    const dark = buildCommandEntries(sources({ theme: "dark", locale: "lt" }));

    expect(light.find((entry) => entry.id === "action-theme")?.label).toBe(
      "commandPalette.theme.dark",
    );
    expect(light.find((entry) => entry.id === "action-locale")?.label).toBe("Lietuvių");
    expect(dark.find((entry) => entry.id === "action-theme")?.label).toBe(
      "commandPalette.theme.light",
    );
    expect(dark.find((entry) => entry.id === "action-locale")?.label).toBe("English");
  });

  test("a record entry opens the ledger filtered by that record", () => {
    const entries = buildCommandEntries(sources());

    expect(entries.find((entry) => entry.id === tagEntry)?.target).toEqual({
      kind: "navigate",
      to: "/transactions",
      search: { tagIds: fixtureIds.tags.holiday },
    });
  });
});

describe("matchScore", () => {
  test("ignores case and accents in both directions", () => {
    expect(foldText("Kavinės")).toBe("kavines");
    expect(matchScore("Kavinės ir restoranai", "kavines")).not.toBeNull();
    expect(matchScore("Kavines ir restoranai", "KAVINĖS")).not.toBeNull();
  });

  test("ranks an exact name above a prefix, a word start, a substring and a subsequence", () => {
    const scores = [
      matchScore("Reports", "reports"),
      matchScore("Reports", "rep"),
      matchScore("Yearly reports", "rep"),
      matchScore("Yearly reports", "ly re"),
      matchScore("Recurring entries", "rue"),
    ];
    const found = scores.filter((score) => score !== null);

    expect(found).toHaveLength(scores.length);
    expect(found).toEqual(found.toSorted((left, right) => left - right));
  });

  test("an empty query matches everything and nonsense matches nothing", () => {
    expect(matchScore("Budgets", "")).toBe(0);
    expect(matchScore("Budgets", "zzzz")).toBeNull();
  });
});

function plainEntry(id: string, label: string, keywords = ""): CommandEntry {
  return {
    id,
    group: "pages",
    label,
    hint: "hint",
    keywords,
    target: { kind: "navigate", to: "/" },
  };
}

describe("filterCommandEntries", () => {
  const taxRow = plainEntry("tax", "Investment tax summary", "Investments");
  const rows: CommandEntry[] = [
    plainEntry("reports", "Reports"),
    plainEntry("recurring", "Recurring entries"),
    taxRow,
    plainEntry("rules", "Rules"),
  ];

  test("an empty query keeps every entry and puts the recent ones first", () => {
    const built = buildCommandEntries(sources({ isAdmin: true }));
    const plain = filterCommandEntries(built, "");
    const recent = filterCommandEntries(built, "", [tagEntry, "page-trash"]);

    expect(plain).toHaveLength(built.length);
    expect(recent).toHaveLength(built.length);
    expect(ids(recent).slice(0, 2)).toEqual([tagEntry, "page-trash"]);
  });

  test("closer matches come first", () => {
    expect(ids(filterCommandEntries(rows, "r"))).toEqual(["reports", "recurring", "rules", "tax"]);
  });

  test("a recent entry wins a tie but never beats a closer match", () => {
    expect(ids(filterCommandEntries(rows, "r", ["rules"]))).toEqual([
      "rules",
      "reports",
      "recurring",
      "tax",
    ]);
    expect(ids(filterCommandEntries(rows, "r", ["tax"]))).toEqual([
      "reports",
      "recurring",
      "rules",
      "tax",
    ]);
  });

  test("a label match beats a keyword match", () => {
    expect(ids(filterCommandEntries(rows, "investments"))).toEqual(["tax"]);
    expect(
      ids(filterCommandEntries([plainEntry("page", "Investments"), taxRow], "investments")),
    ).toEqual(["page", "tax"]);
  });

  test("a query nothing answers gives an empty list", () => {
    expect(filterCommandEntries(rows, "qqqjjj")).toEqual([]);
    expect(filterCommandEntries(buildCommandEntries(sources()), "qqqjjj")).toEqual([]);
  });
});
