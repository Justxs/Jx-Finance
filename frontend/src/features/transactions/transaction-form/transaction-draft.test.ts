import { describe, expect, test } from "vitest";
import type { TransactionResponse } from "@/api/generated/model";
import {
  draftFromTemplate,
  draftFromTransaction,
  duplicateDraft,
  templateValuesFromFormValues,
} from "./transaction-draft";

const split: TransactionResponse = {
  id: "tx-1",
  accountId: "account-1",
  categoryId: null,
  type: "expense",
  amount: "128.40",
  currency: "eur",
  reportingAmount: "128.40",
  date: "2026-09-13",
  description: "Maxima",
  source: "manual",
  isSplit: true,
  createdAt: "2026-09-13T08:30:00Z",
  tagIds: ["tag-1", "tag-2"],
  attachmentCount: 0,
  lines: [
    { id: "line-a", categoryId: "category-1", amount: "74.15", description: "Food" },
    { id: "line-b", categoryId: null, amount: "54.25", description: null },
  ],
};

describe("draftFromTransaction", () => {
  test("carries the account, tags and split lines without their line ids", () => {
    expect(draftFromTransaction(split)).toEqual({
      accountId: "account-1",
      categoryId: null,
      type: "expense",
      amount: "128.40",
      currency: "eur",
      date: "2026-09-13",
      description: "Maxima",
      isSplit: true,
      tagIds: ["tag-1", "tag-2"],
      lines: [
        { categoryId: "category-1", amount: "74.15", description: "Food" },
        { categoryId: null, amount: "54.25", description: null },
      ],
    });
  });

  test("a transaction without lines keeps a null line list", () => {
    expect(draftFromTransaction({ ...split, isSplit: false, lines: null }).lines).toBeNull();
  });
});

describe("duplicateDraft", () => {
  test("keeps everything but the date, so the form falls back to today", () => {
    const draft = duplicateDraft(split);

    expect(draft).not.toHaveProperty("date");
    expect(draft.tagIds).toEqual(["tag-1", "tag-2"]);
    expect(draft.lines).toHaveLength(2);
  });
});

describe("templates", () => {
  const values = {
    accountId: "account-1",
    categoryId: null,
    type: "expense" as const,
    amount: "128.40",
    currency: "eur" as const,
    date: "2026-09-13",
    description: "Maxima",
    tagIds: ["tag-1"],
    lines: [{ categoryId: "category-1", amount: "128.40", description: null }],
  };

  test("a comma typed into the amount is normalized before it is stored", () => {
    const stored = templateValuesFromFormValues({
      ...values,
      amount: "12,50",
      lines: [{ categoryId: null, amount: "12,50", description: null }],
    });

    expect(stored.amount).toBe("12.50");
    expect(stored.lines?.[0]?.amount).toBe("12.50");
  });

  test("a template drops the date and keeps the rest of the shape", () => {
    expect(templateValuesFromFormValues(values)).toEqual({
      accountId: "account-1",
      categoryId: null,
      type: "expense",
      amount: "128.40",
      currency: "eur",
      description: "Maxima",
      tagIds: ["tag-1"],
      lines: [{ categoryId: "category-1", amount: "128.40", description: null }],
    });
  });

  test("a draft from a template has no date and is split when it has lines", () => {
    const draft = draftFromTemplate(templateValuesFromFormValues(values));

    expect(draft.date).toBeUndefined();
    expect(draft.isSplit).toBe(true);
  });

  test("a template without lines is not split", () => {
    const draft = draftFromTemplate(templateValuesFromFormValues({ ...values, lines: null }));

    expect(draft.isSplit).toBe(false);
    expect(draft.lines).toBeNull();
  });

  test("a template whose account was never set leaves the form on its default", () => {
    const draft = draftFromTemplate(
      templateValuesFromFormValues({ ...values, accountId: "", lines: null }),
    );

    expect(draft.accountId).toBeUndefined();
  });
});
