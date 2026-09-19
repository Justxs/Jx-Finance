import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAccountsSuspenseQueryOptions, getBackupsSuspenseQueryOptions } from "@/api/generated";
import { SettingsPage } from "@/features/settings/settings-page";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { checkIsAdmin } from "@/lib/auth-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    if (!(await checkIsAdmin())) {
      throw redirect({ to: "/" });
    }
  },
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, settingsQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getBackupsSuspenseQueryOptions());
  },
  component: SettingsPage,
});
