export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserRole = {
  admin: "Admin",
  member: "Member",
} as const;
