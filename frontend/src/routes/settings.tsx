import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getBackupsSuspenseQueryOptions,
  getSmtpSettingsSuspenseQueryOptions,
} from "@/api/generated";
import { settingsSections } from "@/components/settings-layout/settings-layout";
import { SettingsPage } from "@/features/settings/settings-page/settings-page";
import { SettingsPagePending } from "@/features/settings/settings-page/settings-page-pending";
import { requireAdmin } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";
import { optionalParam } from "@/lib/search-schema";
import { settingsQueryOptions } from "@/lib/settings";

export const settingsSearchSchema = z.object({
  section: optionalParam(z.enum(settingsSections)),
});

export const Route = createFileRoute("/settings")({
  validateSearch: settingsSearchSchema,
  beforeLoad: requireAdmin,
  loaderDeps: ({ search }) => ({ section: search.section }),
  loader: ({ context: { queryClient }, deps: { section } }) => {
    warm(queryClient, settingsQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
    if (section === "backups") {
      warm(queryClient, getBackupsSuspenseQueryOptions());
    }
    if (section === "email") {
      warm(queryClient, getSmtpSettingsSuspenseQueryOptions());
    }
  },
  component: SettingsPage,
  pendingComponent: SettingsPagePending,
});
