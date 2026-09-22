import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { getMeSuspenseQueryOptions, getUsersSuspenseQueryOptions } from "@/api/generated";
import { SortDirection, UserSortField } from "@/api/generated/model";
import { userListParams } from "@/features/users/user-queries";
import { UsersPage } from "@/features/users/users-page/users-page";
import { checkIsAdmin } from "@/lib/auth-gate";
import { warm } from "@/lib/route-prefetch";
import { UserRole } from "@/lib/user-role";

export const usersSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  role: z.enum(UserRole).optional().catch(undefined),
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
    .optional()
    .catch(undefined),
  sort: z.enum(UserSortField).optional().catch(undefined),
  direction: z.enum(SortDirection).optional().catch(undefined),
});

export const Route = createFileRoute("/users")({
  validateSearch: usersSearchSchema,
  beforeLoad: async ({ context: { queryClient } }) => {
    if (!(await checkIsAdmin(queryClient))) {
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
