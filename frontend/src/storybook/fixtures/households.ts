import type { HouseholdMemberResponse, HouseholdResponse } from "@/api/generated/model";
import { ids } from "./base";
import { currentUser, longNameUser, memberUser } from "./users";

export const householdMembers: HouseholdMemberResponse[] = [
  {
    userId: ids.users.ruta,
    email: currentUser.email,
    displayName: currentUser.displayName,
    role: "owner",
  },
  {
    userId: ids.users.sarunas,
    email: memberUser.email,
    displayName: memberUser.displayName,
    role: "member",
  },
];

export const familyHousehold: HouseholdResponse = {
  id: ids.households.family,
  name: "Kazlauskų šeima",
  myRole: "owner",
  members: householdMembers,
};

export const gardenHousehold: HouseholdResponse = {
  id: ids.households.garden,
  name: "Sodininkų bendrija „Ąžuolynas“ – bendros išlaidos, kelio remontas ir vandentiekio fondas",
  myRole: "member",
  members: [
    {
      userId: ids.users.zygimantas,
      email: longNameUser.email,
      displayName: longNameUser.displayName,
      role: "owner",
    },
    {
      userId: ids.users.ruta,
      email: currentUser.email,
      displayName: currentUser.displayName,
      role: "member",
    },
    {
      userId: ids.users.sarunas,
      email: memberUser.email,
      displayName: memberUser.displayName,
      role: "member",
    },
  ],
};

export const households: HouseholdResponse[] = [familyHousehold, gardenHousehold];
