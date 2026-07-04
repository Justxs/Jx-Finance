import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TransactionsPage } from "@/features/transactions/transactions-page";

export const transactionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).catch(1),
});

export const Route = createFileRoute("/transactions")({
  validateSearch: transactionsSearchSchema,
  component: TransactionsPage,
});
