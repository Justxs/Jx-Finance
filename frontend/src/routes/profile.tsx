import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getMeSuspenseQueryOptions } from "@/api/generated";
import { profileSections } from "@/features/profile/profile-nav/profile-nav";
import { ProfilePage } from "@/features/profile/profile-page/profile-page";
import { warm } from "@/lib/route-prefetch";
import { optionalParam } from "@/lib/search-schema";

export const profileSearchSchema = z.object({
  section: optionalParam(z.enum(profileSections)),
});

export const Route = createFileRoute("/profile")({
  validateSearch: profileSearchSchema,
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getMeSuspenseQueryOptions());
  },
  component: ProfilePage,
});
