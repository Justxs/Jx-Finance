import {
  getCategorizationRulesMockHandler,
  getCreateCategorizationRuleMockHandler,
  getDeleteCategorizationRuleMockHandler,
  getMoveCategorizationRuleMockHandler,
  getPreviewCategorizationRunMockHandler,
  getRunCategorizationRulesMockHandler,
  getTestCategorizationRuleMockHandler,
  getUpdateCategorizationRuleMockHandler,
} from "@/api/generated/categorization-rules/categorization-rules.msw";
import type { CategorizationRuleResponse } from "@/api/generated/model";
import { categorizationRules, rulesRunPreview } from "@/storybook/fixtures";
import { found, readBody, text } from "./http";
import type { Body } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";

function mergeRule(base: CategorizationRuleResponse, body: Body): CategorizationRuleResponse {
  return { ...base, ...body };
}

function renumber(rules: CategorizationRuleResponse[]): CategorizationRuleResponse[] {
  return rules.map((rule, position) => ({ ...rule, position }));
}

function moved(id: unknown, direction: unknown): CategorizationRuleResponse[] {
  const ordered = [...categorizationRules];
  const index = ordered.findIndex((rule) => rule.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  const moving = ordered[index];
  const displaced = ordered[target];
  if (moving !== undefined && displaced !== undefined) {
    ordered[index] = displaced;
    ordered[target] = moving;
  }
  return renumber(ordered);
}

export const categorizationRuleHandlers = [
  getCategorizationRulesMockHandler(categorizationRules),
  getCreateCategorizationRuleMockHandler(async ({ request }) => {
    const base: CategorizationRuleResponse = {
      id: NEW_ID,
      name: "",
      position: categorizationRules.length,
      match: "contains",
      pattern: "",
      accountId: null,
      minAmount: null,
      maxAmount: null,
      categoryId: null,
      tagIds: [],
    };
    return mergeRule(base, await readBody(request));
  }),
  getUpdateCategorizationRuleMockHandler(async ({ params, request }) =>
    mergeRule(found(byId(categorizationRules, params.id)), await readBody(request)),
  ),
  getDeleteCategorizationRuleMockHandler(),
  getMoveCategorizationRuleMockHandler(async ({ params, request }) => {
    found(byId(categorizationRules, params.id));
    return moved(params.id, text((await readBody(request)).direction));
  }),
  getTestCategorizationRuleMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const pattern = (text(body.pattern) ?? "").trim().toLocaleLowerCase("lt");
    const description = (text(body.description) ?? "").trim().toLocaleLowerCase("lt");
    const match = text(body.match) ?? "contains";
    let descriptionMatches = false;
    if (pattern.length > 0 && description.length > 0) {
      if (match === "startsWith") {
        descriptionMatches = description.startsWith(pattern);
      } else if (match === "exact") {
        descriptionMatches = description === pattern;
      } else {
        descriptionMatches = description.includes(pattern);
      }
    }
    const amount = text(body.amount);
    const minAmount = text(body.minAmount);
    const maxAmount = text(body.maxAmount);
    const amountMatches =
      amount === null ||
      ((minAmount === null || Number(amount) >= Number(minAmount)) &&
        (maxAmount === null || Number(amount) <= Number(maxAmount)));
    return { matches: descriptionMatches && amountMatches, descriptionMatches, amountMatches };
  }),
  getPreviewCategorizationRunMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return { ...rulesRunPreview, recategorize: body.recategorize === true };
  }),
  getRunCategorizationRulesMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return { ...rulesRunPreview, recategorize: body.recategorize === true };
  }),
];
