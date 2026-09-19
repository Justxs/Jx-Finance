import {
  getCreateCategoryMockHandler,
  getDeleteCategoryMockHandler,
  getCategoriesMockHandler,
  getUpdateCategoryMockHandler,
} from "@/api/generated/categories/categories.msw";
import type { CategoryResponse } from "@/api/generated/model";
import { categories } from "@/storybook/fixtures";
import { found, readBody } from "./http";
import type { Body } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";

export function categoryName(id: string | null): string {
  return categories.find((item) => item.id === id)?.name ?? "";
}

function mergeCategory(base: CategoryResponse, body: Body): CategoryResponse {
  const merged: CategoryResponse = { ...base, ...body };
  return { ...merged, scope: merged.householdId ? "shared" : "personal" };
}

export const categoryHandlers = [
  getCategoriesMockHandler(categories),
  getCreateCategoryMockHandler(async ({ request }) => {
    const base: CategoryResponse = {
      id: NEW_ID,
      name: "",
      type: "expense",
      icon: null,
      isDefault: false,
      scope: "personal",
      householdId: null,
    };
    return mergeCategory(base, await readBody(request));
  }),
  getUpdateCategoryMockHandler(async ({ params, request }) =>
    mergeCategory(found(byId(categories, params.id)), await readBody(request)),
  ),
  getDeleteCategoryMockHandler(),
];
