import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getTransactionsSuspenseQueryOptions,
} from "@/api/generated";
import { ImportPage } from "@/features/imports/import-page";
import { recallParams } from "@/features/imports/import-queries";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const importSearchSchema = z.object({
  accountId: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/import")({
  beforeLoad: requireFeature("import"),
  validateSearch: importSearchSchema,
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getTransactionsSuspenseQueryOptions(recallParams));
  },
  component: ImportPage,
});
