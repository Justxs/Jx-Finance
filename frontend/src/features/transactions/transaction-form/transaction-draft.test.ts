import { describe, expect, test } from "vitest";
import type { TransactionResponse } from "@/api/generated/model";
import { transaction } from "@/storybook/fixtures/transactions";
import {
  draftFromTemplate,
  draftFromTransaction,
  duplicateDraft,
  refundDraft,
  templateValuesFromFormValues,
} from "./transaction-draft";
import { defaultFormFields, toSubmittedValues } from "./transaction-schema";

const split = transaction({
  id: "tx-1",
  accountId: "account-1",
  amount: "128.40",
  reportingAmount: "128.40",
  date: "2026-09-13",
  description: "Maxima",
  isSplit: true,
  createdAt: "2026-09-13T08:30:00Z",
  tagIds: ["tag-1", "tag-2"],
  lines: [
    { id: "line-a", categoryId: "category-1", amount: "74.15", description: "Food" },
    { id: "line-b", categoryId: null, amount: "54.25", description: null },
  ],
});

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
      refundOf: null,
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

  test("copies the place but not the coordinates, which record where one payment was made", () => {
    const draft = duplicateDraft({
      ...split,
      place: "Maxima, Ozo g. 18, Vilnius",
      latitude: 54.71234,
      longitude: 25.28765,
    });

    expect(draft.place).toBe("Maxima, Ozo g. 18, Vilnius");
    expect(draft).not.toHaveProperty("latitude");
    expect(draft).not.toHaveProperty("longitude");
    expect(defaultFormFields(draft, undefined, "2026-09-20")).toMatchObject({
      place: "Maxima, Ozo g. 18, Vilnius",
      latitude: null,
      longitude: null,
    });
  });
});

describe("places", () => {
  test("the edit form keeps the stored place and coordinates and sends them back", () => {
    const fields = defaultFormFields(
      draftFromTransaction({ ...split, place: "Rimi Ozas", latitude: 54.7, longitude: 25.3 }),
      undefined,
      "2026-09-20",
    );

    expect(toSubmittedValues({ ...fields, place: "  Rimi Ozas  " })).toMatchObject({
      place: "Rimi Ozas",
      latitude: 54.7,
      longitude: 25.3,
    });
    expect(toSubmittedValues({ ...fields, place: " " }).place).toBeNull();
  });

  test("a refund copies the place of the purchase without its coordinates", () => {
    const draft = refundDraft({ ...split, place: "Lidl", latitude: 54.7, longitude: 25.3 });

    expect(draft.place).toBe("Lidl");
    expect(draft).not.toHaveProperty("latitude");
  });

  test("a template keeps the place", () => {
    const stored = templateValuesFromFormValues({
      accountId: "account-1",
      categoryId: null,
      type: "expense",
      amount: "3.20",
      currency: "eur",
      date: "2026-09-13",
      description: "Coffee",
      place: "Caffeine Roasters",
      tagIds: [],
      lines: null,
      refundOfTransactionId: null,
    });

    expect(draftFromTemplate(stored).place).toBe("Caffeine Roasters");
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
    refundOfTransactionId: null,
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

describe("refunds", () => {
  const purchase: TransactionResponse = {
    ...split,
    isSplit: false,
    lines: null,
    categoryId: "category-1",
  };

  test("a refund draft copies the purchase, negates the full amount and links it", () => {
    expect(refundDraft(purchase)).toEqual({
      accountId: "account-1",
      categoryId: "category-1",
      type: "expense",
      amount: "-128.40",
      currency: "eur",
      description: "Maxima",
      tagIds: ["tag-1", "tag-2"],
      refundOf: { id: "tx-1", date: "2026-09-13", description: "Maxima" },
    });
    expect(refundDraft(split).categoryId).toBeNull();
  });

  test("a negative expense opens as a refund of the positive size and saves negated with its link", () => {
    const fields = defaultFormFields(refundDraft(purchase), undefined, "2026-09-20");

    expect(fields).toMatchObject({
      type: "refund",
      amount: "128.40",
      isSplit: false,
      date: "2026-09-20",
    });
    expect(toSubmittedValues({ ...fields, amount: "12,50" })).toMatchObject({
      type: "expense",
      amount: "-12.50",
      categoryId: "category-1",
      refundOfTransactionId: "tx-1",
      lines: null,
    });
  });

  test("a refund without a link, or turned back into an expense, sends no link", () => {
    const fields = defaultFormFields(refundDraft(purchase), undefined, "2026-09-20");

    expect(toSubmittedValues({ ...fields, refundOf: null }).refundOfTransactionId).toBeNull();
    expect(toSubmittedValues({ ...fields, type: "expense" })).toMatchObject({
      amount: "128.40",
      refundOfTransactionId: null,
    });
  });
});
