import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getMeSuspenseQueryOptions, getUsersSuspenseQueryOptions } from "@/api/generated";
import { userListParams } from "@/features/users/user-queries";
import { UsersPage } from "@/features/users/users-page/users-page";
import { checkIsAdmin } from "@/lib/auth-gate";
import { warm } from "@/lib/route-prefetch";

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
  loaderDeps: ({ search }) => userListParams(search),
  loader: ({ context: { queryClient }, deps }) => {
    warm(queryClient, getMeSuspenseQueryOptions());
    warm(queryClient, getUsersSuspenseQueryOptions(deps));
  },
  component: UsersPage,
});
