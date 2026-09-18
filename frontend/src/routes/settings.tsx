import { createFileRoute, redirect } from "@tanstack/react-router";
import { SettingsPage } from "@/features/settings/settings-page";
import { checkIsAdmin } from "@/lib/auth-gate";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    if (!(await checkIsAdmin())) {
      throw redirect({ to: "/" });
    }
  },
  component: SettingsPage,
});
