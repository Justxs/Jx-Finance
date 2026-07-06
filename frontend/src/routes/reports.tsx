import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ReportsPage } from "@/features/reports/reports-page";

export const reportsSearchSchema = z.object({
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/reports")({
  validateSearch: reportsSearchSchema,
  component: ReportsPage,
});
