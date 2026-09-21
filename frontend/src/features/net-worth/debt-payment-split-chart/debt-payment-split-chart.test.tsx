import { expect, test } from "vitest";
import { toCents } from "@/lib/money";
import { linearSchedule, mortgageScheduleWithExtra } from "@/storybook/fixtures";
import { splitByYear } from "./debt-payment-split-chart";

function cents(values: readonly number[]) {
  return values.reduce((total, value) => total + Math.round(value * 100), 0);
}

test("payments are summed per calendar year without losing a cent", () => {
  const years = splitByYear(linearSchedule.plan);

  expect(years.map((year) => year.label)).toEqual(["2025", "2026", "2027", "2028", "2029"]);
  expect(cents(years.map((year) => year.principal))).toBe(toCents(linearSchedule.loanAmount));
  expect(cents(years.map((year) => year.interest))).toBe(
    toCents(linearSchedule.plan.totalInterest),
  );
  expect(cents(years.map((year) => year.extra))).toBe(0);
});

test("overpayments are summed as their own part", () => {
  const plan = mortgageScheduleWithExtra.withExtra;
  if (!plan) {
    throw new Error("the fixture has no overpayment plan");
  }

  const years = splitByYear(plan);

  expect(cents(years.map((year) => year.extra))).toBe(toCents(plan.totalExtra));
});
