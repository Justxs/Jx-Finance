import type { UserProfileResponse } from "@/api/generated/model";
import { UserRole } from "@/lib/user-role";
import { ids } from "./base";
import { problemOf } from "./problems";

const validationType = "https://tools.ietf.org/html/rfc9110#section-15.5.1";

type UserSeed = Pick<UserProfileResponse, "id" | "email" | "displayName"> &
  Partial<UserProfileResponse>;

export function userProfile(seed: UserSeed): UserProfileResponse {
  return {
    role: UserRole.member,
    twoFactorEnabled: false,
    isActive: true,
    emailConfirmed: true,
    billReminderEmails: false,
    ...seed,
  };
}

export const currentUser = userProfile({
  id: ids.users.ruta,
  email: "ruta.kazlauskiene@example.lt",
  displayName: "Rūta Kazlauskienė",
  role: UserRole.admin,
});

export const currentUserWithTwoFactor: UserProfileResponse = {
  ...currentUser,
  twoFactorEnabled: true,
};

export const memberUser = userProfile({
  id: ids.users.sarunas,
  email: "sarunas.kazlauskas@example.lt",
  displayName: "Šarūnas Kazlauskas",
  twoFactorEnabled: true,
});

export const longNameUser = userProfile({
  id: ids.users.zygimantas,
  email: "zygimantas.ciurlionis-zemaitaitis.labai.ilgas.adresas@pavyzdine-imone.example.lt",
  displayName: "Žygimantas Augustinas Čiurlionis-Žemaitaitis",
});

export const inactiveUser = userProfile({
  id: ids.users.egle,
  email: "egle.butkute@example.lt",
  displayName: "Eglė Butkutė",
  isActive: false,
});

export const unverifiedUser: UserProfileResponse = {
  ...currentUser,
  emailConfirmed: false,
};

export const reminderSubscriber: UserProfileResponse = {
  ...currentUser,
  billReminderEmails: true,
};

export const users: UserProfileResponse[] = [currentUser, memberUser, longNameUser, inactiveUser];

export const adminPassword = "Correct-horse-42";

export const wrongAdminPasswordProblem = problemOf(
  400,
  "password.incorrect",
  "The current password is wrong.",
  { type: validationType },
);

export const weakPasswordProblem = problemOf(
  400,
  "password.tooWeak",
  "Passwords must have at least one digit.",
  { name: "newPassword", type: validationType },
);

export const lastAdministratorProblem = problemOf(
  403,
  "user.lastAdministrator",
  "The installation must keep one active administrator.",
);
