import { expect, test } from "vitest";
import { splitBytes } from "./format-bytes";

test("picks the largest unit that keeps the number at one or above", () => {
  expect(splitBytes(0)).toEqual({ value: 0, unit: "b" });
  expect(splitBytes(1023)).toEqual({ value: 1023, unit: "b" });
  expect(splitBytes(1024)).toEqual({ value: 1, unit: "kb" });
  expect(splitBytes(1536)).toEqual({ value: 1.5, unit: "kb" });
  expect(splitBytes(5 * 1024 * 1024)).toEqual({ value: 5, unit: "mb" });
  expect(splitBytes(3 * 1024 ** 3)).toEqual({ value: 3, unit: "gb" });
});

test("drops the decimal from three-digit values and never goes past gigabytes", () => {
  expect(splitBytes(150.4 * 1024)).toEqual({ value: 150, unit: "kb" });
  expect(splitBytes(2048 * 1024 ** 3)).toEqual({ value: 2048, unit: "gb" });
  expect(splitBytes(-5)).toEqual({ value: 0, unit: "b" });
});
