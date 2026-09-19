import { expect, test } from "vitest";
import { emptyLine } from "./line-form-value";

test("an empty line is blank apart from a unique id", () => {
  const first = emptyLine();
  const second = emptyLine();

  expect(first).toEqual({ id: first.id, categoryId: "", amount: "", description: "" });
  expect(first.id).not.toBe("");
  expect(first.id).not.toBe(second.id);
});
