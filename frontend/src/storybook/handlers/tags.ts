import type { TagResponse } from "@/api/generated/model";
import {
  getCreateTagMockHandler,
  getDeleteTagMockHandler,
  getTagsMockHandler,
  getUpdateTagMockHandler,
} from "@/api/generated/tags/tags.msw";
import { tags } from "@/storybook/fixtures";
import { mergeScoped, readBody } from "./http";
import { NEW_ID } from "./ids";
import { updateFrom } from "./lists";

export const tagHandlers = [
  getTagsMockHandler(tags),
  getCreateTagMockHandler(async ({ request }) => {
    const base: TagResponse = { id: NEW_ID, name: "", scope: "personal", householdId: null };
    return mergeScoped(base, await readBody(request));
  }),
  getUpdateTagMockHandler(updateFrom(tags, mergeScoped)),
  getDeleteTagMockHandler(),
];
