import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ReportsPage } from "@/features/reports/reports-page";
import { requireFeature } from "@/lib/feature-gate";

export const reportsSearchSchema = z.object({
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/reports")({
  beforeLoad: requireFeature("reports"),
  validateSearch: reportsSearchSchema,
  component: ReportsPage,
});
