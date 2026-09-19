import { createFileRoute } from "@tanstack/react-router";
import { getMeSuspenseQueryOptions } from "@/api/generated";
import { ProfilePage } from "@/features/profile/profile-page";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/profile")({
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getMeSuspenseQueryOptions());
  },
  component: ProfilePage,
});
