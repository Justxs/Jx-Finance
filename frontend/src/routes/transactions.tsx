import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TransactionsPage } from "@/features/transactions/transactions-page";

export const transactionsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1).catch(1),
  search: z.string().optional().catch(undefined),
  accountId: z.uuid().optional().catch(undefined),
  categoryId: z.uuid().optional().catch(undefined),
  type: z.enum(["income", "expense"]).optional().catch(undefined),
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
  sort: z
    .enum(["date", "description", "category", "account", "amount"])
    .optional()
    .catch(undefined),
  direction: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/transactions")({
  validateSearch: transactionsSearchSchema,
  component: TransactionsPage,
});
