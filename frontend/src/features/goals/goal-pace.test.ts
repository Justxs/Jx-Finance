import { expect, test } from "vitest";
import { monthlyToReach } from "./goal-pace";

test("the remaining amount spreads over the whole months left", () => {
  expect(monthlyToReach(800, "2026-09-28", "2027-01-28")).toBe(200);
});

test("a target less than a month away asks for the whole remainder", () => {
  expect(monthlyToReach(800, "2026-09-28", "2026-10-05")).toBe(800);
});

test("the monthly amount rounds up to the cent", () => {
  expect(monthlyToReach(100, "2026-01-01", "2026-04-01")).toBe(33.34);
});

test("there is no estimate without a future date or anything left to save", () => {
  expect(monthlyToReach(800, "2026-09-28", null)).toBeNull();
  expect(monthlyToReach(800, "2026-09-28", "2026-09-01")).toBeNull();
  expect(monthlyToReach(0, "2026-09-28", "2027-01-28")).toBeNull();
});
