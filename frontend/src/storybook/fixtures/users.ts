import type { ProblemDetails, UserProfileResponse } from "@/api/generated/model";
import { ids } from "./base";

export const currentUser: UserProfileResponse = {
  id: ids.users.ruta,
  email: "ruta.kazlauskiene@example.lt",
  displayName: "Rūta Kazlauskienė",
  role: "Admin",
  twoFactorEnabled: false,
  isActive: true,
};

export const currentUserWithTwoFactor: UserProfileResponse = {
  ...currentUser,
  twoFactorEnabled: true,
};

export const memberUser: UserProfileResponse = {
  id: ids.users.sarunas,
  email: "sarunas.kazlauskas@example.lt",
  displayName: "Šarūnas Kazlauskas",
  role: "Member",
  twoFactorEnabled: true,
  isActive: true,
};

export const longNameUser: UserProfileResponse = {
  id: ids.users.zygimantas,
  email: "zygimantas.ciurlionis-zemaitaitis.labai.ilgas.adresas@pavyzdine-imone.example.lt",
  displayName: "Žygimantas Augustinas Čiurlionis-Žemaitaitis",
  role: "Member",
  twoFactorEnabled: false,
  isActive: true,
};

export const inactiveUser: UserProfileResponse = {
  id: ids.users.egle,
  email: "egle.butkute@example.lt",
  displayName: "Eglė Butkutė",
  role: "Member",
  twoFactorEnabled: false,
  isActive: false,
};

export const users: UserProfileResponse[] = [currentUser, memberUser, longNameUser, inactiveUser];

export const adminPassword = "Correct-horse-42";

export const wrongAdminPasswordProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "generalErrors",
      reason: "The current password is wrong.",
      code: "password.incorrect",
    },
  ],
};

export const weakPasswordProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "newPassword",
      reason: "Passwords must have at least one digit.",
      code: "password.tooWeak",
    },
  ],
};

export const lastAdministratorProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.3",
  title: "Forbidden",
  status: 403,
  code: "user.lastAdministrator",
  detail: "The installation must keep one active administrator.",
};
