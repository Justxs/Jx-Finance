import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { accountTypes } from "@/features/accounts/account-types";
import { AccountsPage } from "@/features/accounts/accounts-page";

export const accountsSearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  iban: z.string().optional().catch(undefined),
  type: z.enum(accountTypes).optional().catch(undefined),
  sort: z
    .enum(["created", "name", "iban", "type", "startingBalance", "currentBalance"])
    .optional()
    .catch(undefined),
  direction: z.enum(["asc", "desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/accounts")({
  validateSearch: accountsSearchSchema,
  component: AccountsPage,
});
