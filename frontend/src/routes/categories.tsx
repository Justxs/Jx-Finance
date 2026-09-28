import { createFileRoute } from "@tanstack/react-router";
import {
  getCategoriesSuspenseQueryOptions,
  getHouseholdsSuspenseQueryOptions,
} from "@/api/generated";
import { CategoriesPage } from "@/features/categories/categories-page/categories-page";
import { CategoriesPending } from "@/features/categories/categories-page/categories-page-pending";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/categories")({
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getHouseholdsSuspenseQueryOptions());
  },
  component: CategoriesPage,
  pendingComponent: CategoriesPending,
});
