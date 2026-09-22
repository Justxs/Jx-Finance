import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getBackupsSuspenseQueryOptions,
  getSmtpSettingsSuspenseQueryOptions,
} from "@/api/generated";
import { settingsSections } from "@/features/settings/settings-nav/settings-nav";
import { SettingsPage } from "@/features/settings/settings-page/settings-page";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { checkIsAdmin } from "@/lib/auth-gate";
import { warm } from "@/lib/route-prefetch";

export const settingsSearchSchema = z.object({
  section: z.enum(settingsSections).optional().catch(undefined),
});

export const Route = createFileRoute("/settings")({
  validateSearch: settingsSearchSchema,
  beforeLoad: async ({ context: { queryClient } }) => {
    if (!(await checkIsAdmin(queryClient))) {
      throw redirect({ to: "/" });
    }
  },
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, settingsQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getBackupsSuspenseQueryOptions());
    warm(queryClient, getSmtpSettingsSuspenseQueryOptions());
  },
  component: SettingsPage,
});
