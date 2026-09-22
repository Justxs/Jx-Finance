import { expect, test } from "vitest";
import type { CategorizationRuleResponse } from "@/api/generated/model";
import { categorizationRules } from "@/storybook/fixtures";
import { movedRules } from "./rule-order";

const [template] = categorizationRules;

function rule(id: string, position: number): CategorizationRuleResponse {
  if (template === undefined) {
    throw new Error("the rules fixture is empty");
  }
  return { ...template, id, position };
}

const rules = [rule("a", 0), rule("b", 1), rule("c", 2)];

function order(list: CategorizationRuleResponse[]) {
  return list.map((item) => `${item.id}${item.position}`);
}

test("moving up swaps with the rule above and renumbers", () => {
  expect(order(movedRules(rules, { id: "b", data: { direction: "up" } }))).toEqual([
    "b0",
    "a1",
    "c2",
  ]);
});

test("moving down swaps with the rule below and renumbers", () => {
  expect(order(movedRules(rules, { id: "b", data: { direction: "down" } }))).toEqual([
    "a0",
    "c1",
    "b2",
  ]);
});

test("the first rule cannot move up and the last cannot move down", () => {
  expect(movedRules(rules, { id: "a", data: { direction: "up" } })).toBe(rules);
  expect(movedRules(rules, { id: "c", data: { direction: "down" } })).toBe(rules);
});

test("an unknown rule leaves the list alone", () => {
  expect(movedRules(rules, { id: "missing", data: { direction: "up" } })).toBe(rules);
});
