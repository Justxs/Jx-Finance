import { describe, expect, test } from "vitest";
import type { ReceiptResultResponse } from "@/api/generated/model";
import { maximaReceipt } from "@/storybook/fixtures/receipts";
import {
  type CategoryChoice,
  groupItems,
  itemWeight,
  linesFromReceipt,
  receiptTotals,
  refundCategory,
  shareByWeight,
  shortName,
} from "./receipt-split";

const FOOD = "food";
const HYGIENE = "hygiene";
const choices: CategoryChoice[] = [FOOD, FOOD, FOOD, FOOD, FOOD, HYGIENE, HYGIENE];

function bread() {
  const item = maximaReceipt.items[0];
  if (!item) {
    throw new Error("The fixture has no items.");
  }
  return item;
}

function linesOf(amount: string, receipt: ReceiptResultResponse = maximaReceipt, chosen = choices) {
  const fill = linesFromReceipt(receipt, chosen, amount);
  if (!("lines" in fill)) {
    throw new Error("Expected split lines.");
  }
  return fill.lines.map(({ categoryId, amount: lineAmount, description }) => ({
    categoryId,
    amount: lineAmount,
    description,
  }));
}

describe("the worked example", () => {
  test("weighs each item by its amount, less its discount, plus its deposit", () => {
    expect(maximaReceipt.items.map(itemWeight)).toEqual([189, 238, 343, 184, 89, 349, 479]);
    expect(groupItems(maximaReceipt.items, choices).map((group) => group.weightCents)).toEqual([
      1043, 828,
    ]);
  });

  test("shares 18.21 EUR as Food 10.15 and Hygiene 8.06", () => {
    expect(linesOf("18.21")).toEqual([
      {
        categoryId: FOOD,
        amount: "10.15",
        description: "Duona, Pienas, Sūris, Bananai, Mineralinis vanduo",
      },
      {
        categoryId: HYGIENE,
        amount: "8.06",
        description: "Colgate dantų pasta, Head&Shoulders šampūnas",
      },
    ]);
  });

  test("scales to a payment of 18.31 EUR as Food 10.21 and Hygiene 8.10", () => {
    expect(linesOf("18.31").map((line) => line.amount)).toEqual(["10.21", "8.10"]);
  });

  test("finds no difference between items, printed total and payment", () => {
    expect(receiptTotals(maximaReceipt, "18.21")).toEqual({
      itemsCents: 1821,
      printedCents: 1821,
      amountCents: 1821,
    });
  });
});

describe("linesFromReceipt", () => {
  test("gives one category and no split when every item has the same one", () => {
    expect(
      linesFromReceipt(
        maximaReceipt,
        choices.map(() => FOOD),
        "18.21",
      ),
    ).toEqual({
      categoryId: FOOD,
    });
  });

  test("gives an empty category when no item has one", () => {
    expect(
      linesFromReceipt(
        maximaReceipt,
        choices.map(() => null),
        "18.21",
      ),
    ).toEqual({
      categoryId: "",
    });
  });

  test("keeps uncategorized items on a line of their own", () => {
    const chosen = [...choices.slice(0, 6), null];

    expect(linesOf("18.21", maximaReceipt, chosen).map((line) => line.categoryId)).toEqual([
      FOOD,
      HYGIENE,
      "",
    ]);
  });

  test("drops a group whose share rounds to zero", () => {
    expect(linesFromReceipt(maximaReceipt, choices, "0.01")).toEqual({ categoryId: FOOD });
  });

  test("shares a foreign receipt over the payment in the payment's currency", () => {
    const zloty = { ...maximaReceipt, currency: "pln" as const, total: "78.00" };

    const lines = linesOf("18.21", zloty);

    expect(lines.map((line) => line.amount)).toEqual(["10.15", "8.06"]);
  });

  test("falls back to the printed total when the payment has no amount yet", () => {
    expect(linesOf("").map((line) => line.amount)).toEqual(["10.15", "8.06"]);
  });

  test("clips a long line description to what a line can hold", () => {
    const long = {
      ...maximaReceipt,
      items: maximaReceipt.items.map((item) => ({ ...item, name: "x".repeat(200) })),
    };

    expect(linesOf("18.21", long).every((line) => line.description.length <= 500)).toBe(true);
  });
});

describe("refundCategory", () => {
  test("takes the category of the heaviest group of items", () => {
    expect(refundCategory(maximaReceipt.items, choices)).toBe(FOOD);
    expect(
      refundCategory(maximaReceipt.items, [
        HYGIENE,
        HYGIENE,
        HYGIENE,
        HYGIENE,
        HYGIENE,
        FOOD,
        FOOD,
      ]),
    ).toBe(HYGIENE);
  });

  test("weighs items the way the split does, net of discounts", () => {
    const discounted = maximaReceipt.items.map((item, index) =>
      index < 5 ? { ...item, discount: item.amount } : item,
    );

    expect(refundCategory(discounted, choices)).toBe(HYGIENE);
  });

  test("keeps the first group on a tie", () => {
    const twins = [bread(), bread()];

    expect(refundCategory(twins, [HYGIENE, FOOD])).toBe(HYGIENE);
    expect(refundCategory(twins, [FOOD, HYGIENE])).toBe(FOOD);
  });

  test("gives no category when the heaviest items have none", () => {
    expect(
      refundCategory(maximaReceipt.items, [null, null, null, null, null, HYGIENE, HYGIENE]),
    ).toBe("");
    expect(refundCategory(maximaReceipt.items, [])).toBe("");
    expect(refundCategory([], [])).toBe("");
  });

  test("changes when an item moves to another category", () => {
    const moved = [FOOD, FOOD, HYGIENE, FOOD, FOOD, HYGIENE, HYGIENE];

    expect(refundCategory(maximaReceipt.items, moved)).toBe(HYGIENE);
  });
});

describe("itemWeight", () => {
  test("gives an item that was fully discounted no weight", () => {
    expect(itemWeight({ ...bread(), discount: "1.89" })).toBe(0);
    expect(itemWeight({ ...bread(), discount: "2.50" })).toBe(0);
  });
});

describe("shareByWeight", () => {
  test("hands the leftover cent to the larger remainder", () => {
    expect(shareByWeight(1821, [1043, 828])).toEqual([1015, 806]);
  });

  test("breaks a tie on remainder in favour of the larger group", () => {
    expect(shareByWeight(2, [1, 3])).toEqual([0, 2]);
  });

  test("breaks a full tie in favour of the first group", () => {
    expect(shareByWeight(1, [50, 50])).toEqual([1, 0]);
  });

  test("puts everything on the first group when nothing has weight", () => {
    expect(shareByWeight(500, [0, 0])).toEqual([500, 0]);
  });

  test("always adds up to the total", () => {
    const shares = shareByWeight(9999, [7, 13, 29, 51]);

    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(9999);
  });
});

describe("receiptTotals", () => {
  test("reports items that do not add up to the printed total", () => {
    const misread = {
      ...maximaReceipt,
      items: maximaReceipt.items.map((item, index) =>
        index === 0 ? { ...item, amount: "1.79" } : item,
      ),
    };

    expect(receiptTotals(misread, "18.21")).toEqual({
      itemsCents: 1811,
      printedCents: 1821,
      amountCents: 1821,
    });
  });

  test("has no payment amount while the amount field is not money", () => {
    expect(receiptTotals(maximaReceipt, "abc").amountCents).toBeNull();
  });
});

test("shortName keeps the words before the first size or brand in quotes", () => {
  expect(maximaReceipt.items.map((item) => shortName(item.name))).toEqual([
    "Duona",
    "Pienas",
    "Sūris",
    "Bananai",
    "Mineralinis vanduo",
    "Colgate dantų pasta",
    "Head&Shoulders šampūnas",
  ]);
});
