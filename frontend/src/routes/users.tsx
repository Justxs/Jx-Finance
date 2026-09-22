import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getMeSuspenseQueryOptions, getUsersSuspenseQueryOptions } from "@/api/generated";
import { UserSortField } from "@/api/generated/model";
import { userListParams } from "@/features/users/user-queries";
import { UsersPage } from "@/features/users/users-page/users-page";
import { requireAdmin } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";
import { optionalParam, sortParams } from "@/lib/search-schema";
import { UserRole } from "@/lib/user-role";

export const usersSearchSchema = z.object({
  search: optionalParam(z.string()),
  role: optionalParam(z.enum(UserRole)),
  isActive: optionalParam(
    z.union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")]),
  ),
  ...sortParams(UserSortField),
});

export const Route = createFileRoute("/users")({
  validateSearch: usersSearchSchema,
  beforeLoad: requireAdmin,
  loaderDeps: ({ search }) => userListParams(search),
  loader: ({ context: { queryClient }, deps }) => {
    warm(queryClient, getMeSuspenseQueryOptions());
    warm(queryClient, getUsersSuspenseQueryOptions(deps));
  },
  component: UsersPage,
});
