import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getMeSuspenseQueryOptions, getMyDiscordSuspenseQueryOptions } from "@/api/generated";
import { ProfilePage } from "@/features/profile/profile-page/profile-page";
import { ProfilePending } from "@/features/profile/profile-page/profile-page-pending";
import { profileSections } from "@/features/settings/settings-nav/settings-nav";
import { warm } from "@/lib/route-prefetch";
import { optionalParam } from "@/lib/search-schema";

export const profileSearchSchema = z.object({
  section: optionalParam(z.enum(profileSections)),
});

export const Route = createFileRoute("/profile")({
  validateSearch: profileSearchSchema,
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getMeSuspenseQueryOptions());
    warm(queryClient, getMyDiscordSuspenseQueryOptions());
  },
  component: ProfilePage,
  pendingComponent: ProfilePending,
});
