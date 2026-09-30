import { expect, test } from "vitest";
import { dueSoonBill, inactiveBill, incomeBill, overdueBill } from "@/storybook/fixtures";
import { groupBills } from "./bill-groups";

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
