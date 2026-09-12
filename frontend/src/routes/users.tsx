import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { UsersPage } from "@/features/users/users-page";
import { checkIsAdmin } from "@/lib/auth-gate";

export const usersSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  role: z.enum(["Admin", "Member"]).optional().catch(undefined),
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
    .optional()
    .catch(undefined),
  sort: z.enum(["displayName", "email", "role", "status"]).optional().catch(undefined),
  direction: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/users")({
  validateSearch: usersSearchSchema,
  beforeLoad: async () => {
    if (!(await checkIsAdmin())) {
      throw redirect({ to: "/" });
    }
  },
  component: UsersPage,
});
