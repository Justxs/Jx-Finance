import {
  getAddMemberMockHandler,
  getCreateHouseholdMockHandler,
  getDeleteHouseholdMockHandler,
  getHouseholdMockHandler,
  getHouseholdsMockHandler,
  getRemoveMemberMockHandler,
  getUpdateHouseholdMockHandler,
  getUpdateMemberRoleMockHandler,
} from "@/api/generated/households/households.msw";
import type { HouseholdResponse } from "@/api/generated/model";
import { familyHousehold, households, users } from "@/storybook/fixtures";
import { found, readBody, text } from "./http";
import type { Body } from "./http";
import { NEW_ID, NEW_USER_ID } from "./ids";
import { byId } from "./lists";

function withAddedMember(household: HouseholdResponse, body: Body): HouseholdResponse {
  const email = text(body.email) ?? "naujas.narys@example.lt";
  const known = users.find((item) => item.email === email);
  return {
    ...household,
    members: [
      ...household.members,
      {
        userId: known?.id ?? NEW_USER_ID,
        email,
        displayName: known?.displayName ?? email.split("@")[0] ?? email,
        role: body.role === "owner" ? "owner" : "member",
      },
    ],
  };
}

export const householdHandlers = [
  getHouseholdsMockHandler(households),
  getCreateHouseholdMockHandler(async ({ request }) => {
    const body = await readBody(request);
    return {
      id: NEW_ID,
      name: text(body.name) ?? "",
      myRole: "owner",
      members: familyHousehold.members.slice(0, 1),
    };
  }),
  getHouseholdMockHandler(({ params }) => found(byId(households, params.id))),
  getUpdateHouseholdMockHandler(async ({ params, request }) => {
    const household = found(byId(households, params.id));
    const body = await readBody(request);
    return { ...household, name: text(body.name) ?? household.name };
  }),
  getDeleteHouseholdMockHandler(),
  getAddMemberMockHandler(async ({ params, request }) =>
    withAddedMember(found(byId(households, params.id)), await readBody(request)),
  ),
  getUpdateMemberRoleMockHandler(async ({ params, request }) => {
    const household = found(byId(households, params.id));
    const body = await readBody(request);
    return {
      ...household,
      members: household.members.map((member) =>
        member.userId === params.userId
          ? { ...member, role: body.role === "owner" ? "owner" : "member" }
          : member,
      ),
    };
  }),
  getRemoveMemberMockHandler(({ params }) => {
    const household = found(byId(households, params.id));
    return {
      ...household,
      members: household.members.filter((member) => member.userId !== params.userId),
    };
  }),
];
