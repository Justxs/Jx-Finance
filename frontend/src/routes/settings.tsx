import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getBackupsSuspenseQueryOptions,
  getSmtpSettingsSuspenseQueryOptions,
} from "@/api/generated";
import { settingsSections } from "@/features/settings/settings-nav/settings-nav";
import { SettingsPage } from "@/features/settings/settings-page/settings-page";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { requireAdmin } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";
import { optionalParam } from "@/lib/search-schema";

export const settingsSearchSchema = z.object({
  section: optionalParam(z.enum(settingsSections)),
});

export const Route = createFileRoute("/settings")({
  validateSearch: settingsSearchSchema,
  beforeLoad: requireAdmin,
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, settingsQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getBackupsSuspenseQueryOptions());
    warm(queryClient, getSmtpSettingsSuspenseQueryOptions());
  },
  component: SettingsPage,
});
