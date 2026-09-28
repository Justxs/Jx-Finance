import { expect, test } from "vitest";
import { dueSoonBill, inactiveBill, incomeBill, overdueBill } from "@/storybook/fixtures";
import { daysUntil, groupBills } from "./bill-groups";

test("days until counts calendar days across a month end", () => {
  expect(daysUntil("2026-10-01", "2026-09-30")).toBe(1);
  expect(daysUntil("2026-09-28", "2026-09-30")).toBe(-2);
  expect(daysUntil("2026-09-30", "2026-09-30")).toBe(0);
  expect(daysUntil("", "2026-09-30")).toBeNull();
});

test("active bills group by urgency and inactive ones stay apart", () => {
  const { groups, inactive } = groupBills(
    [overdueBill, dueSoonBill, incomeBill, inactiveBill],
    "2026-09-18",
  );

  expect(groups.overdue).toEqual([overdueBill]);
  expect(groups.thisWeek).toEqual([dueSoonBill]);
  expect(groups.later).toEqual([incomeBill]);
  expect(inactive).toEqual([inactiveBill]);
});

test("a bill due in exactly a week is later, not this week", () => {
  const { groups } = groupBills([{ ...dueSoonBill, nextDueDate: "2026-09-25" }], "2026-09-18");

  expect(groups.later).toHaveLength(1);
});
