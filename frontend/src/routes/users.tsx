import { createFileRoute, redirect } from "@tanstack/react-router";
import { UsersPage } from "@/features/users/users-page";
import { checkIsAdmin } from "@/lib/auth-gate";

export const Route = createFileRoute("/users")({
  beforeLoad: async () => {
    if (!(await checkIsAdmin())) {
      throw redirect({ to: "/" });
    }
  },
  component: UsersPage,
});
