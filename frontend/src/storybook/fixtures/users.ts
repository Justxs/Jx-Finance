import type { UserProfileResponse } from "@/api/generated/model";
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
