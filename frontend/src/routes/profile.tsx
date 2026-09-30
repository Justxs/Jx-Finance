import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getMeSuspenseQueryOptions, getMyDiscordSuspenseQueryOptions } from "@/api/generated";
import { profileSections } from "@/components/settings-layout/settings-layout";
import { ProfilePage } from "@/features/profile/profile-page/profile-page";
import { ProfilePending } from "@/features/profile/profile-page/profile-page-pending";
import { warm } from "@/lib/route-prefetch";
import { optionalParam } from "@/lib/search-schema";

export const profileSearchSchema = z.object({
  section: optionalParam(z.enum(profileSections)),
});

export const Route = createFileRoute("/profile")({
  validateSearch: profileSearchSchema,
  loaderDeps: ({ search }) => ({ section: search.section }),
  loader: ({ context: { queryClient }, deps: { section } }) => {
    warm(queryClient, getMeSuspenseQueryOptions());
    if (section === "notifications") {
      warm(queryClient, getMyDiscordSuspenseQueryOptions());
    }
  },
  component: ProfilePage,
  pendingComponent: ProfilePending,
});
