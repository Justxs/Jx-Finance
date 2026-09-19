import { expect, test } from "vitest";
import { cashEffect } from "./cash-effect";

const blank = { quantity: "", price: "", fee: "", amount: "" };

test("a buy takes the cost and the fee out of the account", () => {
  expect(cashEffect({ ...blank, type: "buy", quantity: "10", price: "98,40", fee: "1,25" })).toBe(
    "-985.25",
  );
  expect(cashEffect({ ...blank, type: "buy", quantity: "0.5", price: "100" })).toBe("-50.00");
});

test("a sell brings in the proceeds less the fee", () => {
  expect(cashEffect({ ...blank, type: "sell", quantity: "3", price: "210.10", fee: "1" })).toBe(
    "629.30",
  );
});

test("half cents round away from zero like the server", () => {
  expect(cashEffect({ ...blank, type: "buy", quantity: "8.5", price: "1.23" })).toBe("-10.46");
  expect(cashEffect({ ...blank, type: "sell", quantity: "2.5", price: "0.41" })).toBe("1.03");
  expect(cashEffect({ ...blank, type: "buy", quantity: "2.5", price: "0.41" })).toBe("-1.03");
  expect(cashEffect({ ...blank, type: "sell", quantity: "0.00000001", price: "50000000" })).toBe(
    "0.50",
  );
});

test("a sell whose fee exceeds the proceeds takes cash out", () => {
  expect(cashEffect({ ...blank, type: "sell", quantity: "1", price: "0.50", fee: "2" })).toBe(
    "-1.50",
  );
  expect(cashEffect({ ...blank, type: "sell", quantity: "0.5", price: "0.01", fee: "1" })).toBe(
    "-1.00",
  );
});

test("income adds cash and charges remove it", () => {
  expect(cashEffect({ ...blank, type: "dividend", amount: "12,40" })).toBe("12.40");
  expect(cashEffect({ ...blank, type: "interest", amount: "3.05" })).toBe("3.05");
  expect(cashEffect({ ...blank, type: "withholdingTax", amount: "1.86" })).toBe("-1.86");
  expect(cashEffect({ ...blank, type: "fee", amount: "10" })).toBe("-10.00");
});

test("a split moves no cash", () => {
  expect(cashEffect({ ...blank, type: "split", quantity: "2" })).toBe("0.00");
});

test("a blank fee counts as zero", () => {
  expect(cashEffect({ ...blank, type: "buy", quantity: "1", price: "5", fee: "  " })).toBe("-5.00");
});

test("large positions keep exact cents", () => {
  expect(
    cashEffect({ ...blank, type: "buy", quantity: "123456789.12345678", price: "98765.4321" }),
  ).toBe("-12193263123456.79");
});

test("incomplete or malformed input gives no figure", () => {
  expect(cashEffect({ ...blank, type: "buy", quantity: "10" })).toBeNull();
  expect(cashEffect({ ...blank, type: "buy", quantity: "10", price: "5", fee: "x" })).toBeNull();
  expect(cashEffect({ ...blank, type: "dividend", amount: "-4" })).toBeNull();
  expect(cashEffect({ ...blank, type: "buy", quantity: "1", price: "0" })).toBe("0.00");
});

test("input that validation rejects gives no figure", () => {
  expect(cashEffect({ ...blank, type: "buy", quantity: "1.123456789", price: "5" })).toBeNull();
  expect(cashEffect({ ...blank, type: "buy", quantity: "1", price: "5.123456789" })).toBeNull();
  expect(cashEffect({ ...blank, type: "buy", quantity: "1", price: "5", fee: "0.125" })).toBeNull();
  expect(cashEffect({ ...blank, type: "dividend", amount: "4.125" })).toBeNull();
});
