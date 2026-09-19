import { describe, expect, test } from "vitest";
import {
  isEmail,
  isIban,
  isMoney,
  isNonNegativeMoney,
  isPositiveMoney,
  isPositiveQuantity,
  isQuantity,
  isRate,
  normalizeMoney,
} from "./validation";

describe("money", () => {
  test.each([
    ["12,50", "12.50"],
    [" 12.50 ", "12.50"],
    ["-0,10", "-0.10"],
  ])("%s normalizes to the exact wire string %s", (input, expected) => {
    expect(isMoney(input)).toBe(true);
    expect(normalizeMoney(input)).toBe(expected);
  });

  test.each(["1,234.56", "1.234,56", "12,345", "1e3", "NaN", "Infinity", "", "--2"])(
    "rejects %j",
    (value) => {
      expect(isMoney(value)).toBe(false);
    },
  );

  test("expense inputs must be positive", () => {
    expect(isPositiveMoney("0,01")).toBe(true);
    expect(isPositiveMoney("0,00")).toBe(false);
    expect(isPositiveMoney("-0,01")).toBe(false);
  });

  test("fees may be zero but not negative", () => {
    expect(isNonNegativeMoney("0")).toBe(true);
    expect(isNonNegativeMoney("1,25")).toBe(true);
    expect(isNonNegativeMoney("-1")).toBe(false);
    expect(isNonNegativeMoney("1.255")).toBe(false);
  });
});

describe("quantities", () => {
  test.each(["1", "0,5", "42.12345678", " 3,25 ", "0"])("accepts %j", (value) => {
    expect(isQuantity(value)).toBe(true);
  });

  test.each(["", "-1", "1.123456789", "1,2,3", "1e3", "abc"])("rejects %j", (value) => {
    expect(isQuantity(value)).toBe(false);
  });

  test("positive quantities exclude zero", () => {
    expect(isPositiveQuantity("0,00000001")).toBe(true);
    expect(isPositiveQuantity("0")).toBe(false);
  });
});

describe("rates", () => {
  test.each(["", "  ", "1", "0,92", "1.0825123"])("accepts %j", (value) => {
    expect(isRate(value)).toBe(true);
  });

  test.each(["-1", "abc", "1.", "1,2,3", "1e3"])("rejects %j", (value) => {
    expect(isRate(value)).toBe(false);
  });
});

describe("emails", () => {
  test.each(["a@b", "justas@example.com", "first.last+tag@sub.example.lt"])(
    "accepts %j",
    (value) => {
      expect(isEmail(value)).toBe(true);
    },
  );

  test.each(["", "plain", "@example.com", "user@", "a b@example.com", "a@b@c"])(
    "rejects %j",
    (value) => {
      expect(isEmail(value)).toBe(false);
    },
  );
});

describe("IBANs", () => {
  test.each(["LT121000011101001000", "lt12 1000 0111 0100 1000", "GB82WEST12345698765432"])(
    "accepts %j",
    (value) => {
      expect(isIban(value)).toBe(true);
    },
  );

  test.each(["", "LT12", "1234567890123456", "L1121000011101001000", "LT12-1000-0111-0100-1000"])(
    "rejects %j",
    (value) => {
      expect(isIban(value)).toBe(false);
    },
  );
});
