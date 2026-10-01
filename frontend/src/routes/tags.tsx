import { createFileRoute } from "@tanstack/react-router";
import {
  getHouseholdsSuspenseQueryOptions,
  getPayeeNamesSuspenseQueryOptions,
  getPlacesSuspenseQueryOptions,
  getTagsSuspenseQueryOptions,
} from "@/api/generated";
import { TagsPage } from "@/features/tags/tags-page/tags-page";
import { TagsPending } from "@/features/tags/tags-page/tags-page-pending";
import { warm, warmWithSettings } from "@/lib/route-prefetch";

export const Route = createFileRoute("/tags")({
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getTagsSuspenseQueryOptions());
    warm(queryClient, getHouseholdsSuspenseQueryOptions());
    warm(queryClient, getPayeeNamesSuspenseQueryOptions());
    warmWithSettings(queryClient, (settings) => {
      if (settings.features.locations) {
        warm(queryClient, getPlacesSuspenseQueryOptions({ own: true }));
      }
    });
  },
  component: TagsPage,
  pendingComponent: TagsPending,
});
