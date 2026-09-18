import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ImportPage } from "@/features/imports/import-page";
import { requireFeature } from "@/lib/feature-gate";

export const importSearchSchema = z.object({
  accountId: z.uuid().optional().catch(undefined),
});

export const Route = createFileRoute("/import")({
  beforeLoad: requireFeature("import"),
  validateSearch: importSearchSchema,
  component: ImportPage,
});
