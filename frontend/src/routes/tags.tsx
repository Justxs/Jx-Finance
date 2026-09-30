import { createFileRoute } from "@tanstack/react-router";
import {
  getHouseholdsSuspenseQueryOptions,
  getPayeeNamesSuspenseQueryOptions,
  getTagsSuspenseQueryOptions,
} from "@/api/generated";
import { TagsPage } from "@/features/tags/tags-page/tags-page";
import { TagsPending } from "@/features/tags/tags-page/tags-page-pending";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/tags")({
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getTagsSuspenseQueryOptions());
    warm(queryClient, getHouseholdsSuspenseQueryOptions());
    warm(queryClient, getPayeeNamesSuspenseQueryOptions());
  },
  component: TagsPage,
  pendingComponent: TagsPending,
});
