import { describe, expect, test } from "vitest";
import { nameById, namedOptions, optionsOf, withMissingOption } from "./options";

const accounts = [
  { id: "a1", name: "Everyday" },
  { id: "a2", name: "Savings" },
];

describe("namedOptions", () => {
  test("turns named records into select options", () => {
    expect(namedOptions(accounts)).toEqual([
      { value: "a1", label: "Everyday" },
      { value: "a2", label: "Savings" },
    ]);
  });

  test("puts the blank choice first when it has a label", () => {
    expect(namedOptions(accounts, "All accounts")[0]).toEqual({ value: "", label: "All accounts" });
    expect(namedOptions(accounts, "All accounts")).toHaveLength(3);
  });

  test("lets the blank choice carry its own value", () => {
    expect(namedOptions([], "Uncategorized", "none")).toEqual([
      { value: "none", label: "Uncategorized" },
    ]);
  });
});

describe("nameById", () => {
  test("looks names up by id", () => {
    expect(nameById(accounts).get("a2")).toBe("Savings");
  });

  test("is empty while the list is missing", () => {
    expect(nameById(undefined).size).toBe(0);
  });
});

describe("withMissingOption", () => {
  test("adds the selected id when no option covers it", () => {
    expect(withMissingOption(namedOptions(accounts), "gone", "Unavailable account").at(-1)).toEqual(
      {
        value: "gone",
        label: "Unavailable account",
      },
    );
  });

  test("leaves the options alone when the id is present or blank", () => {
    expect(withMissingOption(namedOptions(accounts), "a1", "Unavailable")).toHaveLength(2);
    expect(withMissingOption(namedOptions(accounts), undefined, "Unavailable")).toHaveLength(2);
    expect(withMissingOption(namedOptions(accounts), "", "Unavailable")).toHaveLength(2);
  });
});

describe("optionsOf", () => {
  test("labels each value in order", () => {
    expect(optionsOf(["expense", "income"], (value) => value.toUpperCase())).toEqual([
      { value: "expense", label: "EXPENSE" },
      { value: "income", label: "INCOME" },
    ]);
  });
});
