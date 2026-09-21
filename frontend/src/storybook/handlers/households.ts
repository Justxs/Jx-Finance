import {
  getAddMemberMockHandler,
  getCreateHouseholdMockHandler,
  getDeleteHouseholdMockHandler,
  getHouseholdAuditMockHandler,
  getHouseholdMockHandler,
  getHouseholdsMockHandler,
  getRemoveMemberMockHandler,
  getUpdateHouseholdMockHandler,
  getUpdateMemberRoleMockHandler,
} from "@/api/generated/households/households.msw";
import type { AuditEventResponse, HouseholdResponse } from "@/api/generated/model";
import { familyHousehold, householdAuditEvents, households, users } from "@/storybook/fixtures";
import { found, readBody, text } from "./http";
import type { Body } from "./http";
import { NEW_ID, NEW_USER_ID } from "./ids";
import { byId, paginate } from "./lists";

export function filterAudit(events: AuditEventResponse[], params: URLSearchParams) {
  const memberId = params.get("memberId");
  const kind = params.get("kind");
  const dateFrom = params.get("dateFrom");
  const dateTo = params.get("dateTo");
  return events.filter(
    (item) =>
      (!memberId || item.actorUserId === memberId) &&
      (!kind || item.entityKind === kind) &&
      (!dateFrom || item.occurredAt.slice(0, 10) >= dateFrom) &&
      (!dateTo || item.occurredAt.slice(0, 10) <= dateTo),
  );
}

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
  getHouseholdAuditMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    return paginate(filterAudit(householdAuditEvents, params), params);
  }),
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
