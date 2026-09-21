import type { TagResponse } from "@/api/generated/model";
import {
  getCreateTagMockHandler,
  getDeleteTagMockHandler,
  getTagsMockHandler,
  getUpdateTagMockHandler,
} from "@/api/generated/tags/tags.msw";
import { tags } from "@/storybook/fixtures";
import { found, readBody } from "./http";
import type { Body } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";

function mergeTag(base: TagResponse, body: Body): TagResponse {
  const merged: TagResponse = { ...base, ...body };
  return { ...merged, scope: merged.householdId ? "shared" : "personal" };
}

export const tagHandlers = [
  getTagsMockHandler(tags),
  getCreateTagMockHandler(async ({ request }) => {
    const base: TagResponse = { id: NEW_ID, name: "", scope: "personal", householdId: null };
    return mergeTag(base, await readBody(request));
  }),
  getUpdateTagMockHandler(async ({ params, request }) =>
    mergeTag(found(byId(tags, params.id)), await readBody(request)),
  ),
  getDeleteTagMockHandler(),
];
