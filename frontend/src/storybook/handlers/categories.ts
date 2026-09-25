import {
  getCreateCategoryMockHandler,
  getDeleteCategoryMockHandler,
  getCategoriesMockHandler,
  getUpdateCategoryMockHandler,
} from "@/api/generated/categories/categories.msw";
import type { CategoryResponse } from "@/api/generated/model";
import { categories } from "@/storybook/fixtures";
import { mergeScoped, readBody } from "./http";
import { NEW_ID } from "./ids";
import { updateFrom } from "./lists";

export function categoryName(id: string | null): string {
  return categories.find((item) => item.id === id)?.name ?? "";
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
    return mergeScoped(base, await readBody(request));
  }),
  getUpdateCategoryMockHandler(updateFrom(categories, mergeScoped)),
  getDeleteCategoryMockHandler(),
];
