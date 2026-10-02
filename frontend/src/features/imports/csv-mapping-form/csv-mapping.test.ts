import { expect, test } from "vitest";
import { cardInspection, revolutInspection, revolutMapping } from "@/storybook/fixtures";
import { draftOf, missingColumns, sourceOf, toRequest } from "./csv-mapping";

test("a new mapping starts from the first date column and the first number column", () => {
  const draft = draftOf(sourceOf(revolutInspection, undefined), undefined);

  expect(draft.columns.date).toBe("Started Date");
  expect(draft.columns.amount).toBe("Amount");
  expect(draft.dateFormat).toBe("yyyy-MM-dd");
  expect(draft.decimalSeparator).toBe("dot");
});

test("a card statement proposes its decimal comma and the lines above its header", () => {
  const draft = draftOf(sourceOf(cardInspection, undefined), undefined);

  expect([draft.decimalSeparator, draft.skipLines, draft.delimiter]).toEqual(["comma", "3", ";"]);
});

test("a saved mapping without a file offers only the columns it names", () => {
  const source = sourceOf(undefined, revolutMapping);

  expect(source.columns.map((column) => column.name)).toEqual([
    "Completed Date",
    "Description",
    "Amount",
    "Currency",
    "Balance",
    "Fee",
    "State",
  ]);
  expect(toRequest(draftOf(source, revolutMapping))).toEqual({
    name: revolutMapping.name,
    encoding: revolutMapping.encoding,
    delimiter: revolutMapping.delimiter,
    skipLines: revolutMapping.skipLines,
    noHeaderRow: revolutMapping.noHeaderRow,
    amountStyle: revolutMapping.amountStyle,
    dateFormat: revolutMapping.dateFormat,
    decimalSeparator: revolutMapping.decimalSeparator,
    currency: null,
    columns: revolutMapping.columns,
  });
});

test("each amount style names the columns it still needs", () => {
  const draft = draftOf(sourceOf(revolutInspection, undefined), undefined);

  expect(missingColumns(draft)).toEqual([]);
  expect(missingColumns({ ...draft, amountStyle: "debitCredit" })).toEqual(["debit", "credit"]);
  expect(
    missingColumns({
      ...draft,
      amountStyle: "amountWithDirection",
      columns: { ...draft.columns, status: "State" },
    }),
  ).toEqual(["direction", "expenseValue", "bookedValues"]);
});

test("columns the chosen amount style does not read are sent empty", () => {
  const draft = draftOf(sourceOf(revolutInspection, undefined), undefined);

  const request = toRequest({
    ...draft,
    amountStyle: "debitCredit",
    columns: { ...draft.columns, debit: "Amount", credit: "Fee" },
  });

  expect([request.columns.amount, request.columns.debit, request.columns.credit]).toEqual([
    null,
    "Amount",
    "Fee",
  ]);
});

test("a new mapping for a card account starts on the card statement amount style", () => {
  const source = sourceOf(cardInspection, undefined);

  expect(draftOf(source, undefined).amountStyle).toBe("signedNegativeIsExpense");
  expect(draftOf(source, undefined, "signedPositiveIsExpense").amountStyle).toBe(
    "signedPositiveIsExpense",
  );
});

test("a saved mapping keeps its own amount style on a card account", () => {
  const source = sourceOf(revolutInspection, revolutMapping);

  expect(draftOf(source, revolutMapping, "signedPositiveIsExpense").amountStyle).toBe(
    revolutMapping.amountStyle,
  );
});
