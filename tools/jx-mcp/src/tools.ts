import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { type JxApi, JxApiError, type Query } from "./jx-api.js";

const date = z.iso.date().describe("A date as YYYY-MM-DD.");
const id = z.uuid();
const decimal = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/u)
  .describe("An amount such as 12.50.");

export interface JxTool {
  name: string;
  path: string;
  description: string;
  input: z.ZodObject;
}

export const jxTools: JxTool[] = [
  {
    name: "list_accounts",
    path: "/api/accounts",
    description:
      "List accounts. Returns the accounts you can see: your own plus the shared accounts of your households, each with its current balance. With asOf, the balances are as of that date instead.",
    input: z.object({
      search: z.string().optional().describe("Case-insensitive match against the account name."),
      type: z.enum(["checking", "savings", "cash", "other", "investment"]).optional(),
      asOf: date.optional().describe("Date to compute the balances at. Defaults to today."),
    }),
  },
  {
    name: "list_transactions",
    path: "/api/transactions",
    description:
      "List transactions. Returns a page of the ledger, newest first, restricted to what you can see. Every filter is optional and they combine with AND. The answer holds items, page, pageSize and total; ask for the next page while page * pageSize < total. A refund is an expense with a negative amount.",
    input: z.object({
      page: z.int().min(1).default(1).describe("One-based page number."),
      pageSize: z.int().min(1).max(200).default(50).describe("Rows per page, at most 200."),
      accountId: id.optional().describe("Keep only transactions on this account."),
      categoryId: id
        .optional()
        .describe("Keep only transactions in this category, split lines included."),
      tagIds: z
        .string()
        .optional()
        .describe("Comma-separated tag ids; a transaction must carry every one."),
      type: z.enum(["income", "expense"]).optional(),
      search: z
        .string()
        .optional()
        .describe("Case-insensitive match against the description, the note or the payee name."),
      payee: z
        .string()
        .optional()
        .describe("Keep only transactions of this payee, compared normalized."),
      dateFrom: date.optional().describe("Inclusive start date."),
      dateTo: date.optional().describe("Inclusive end date."),
      amountMin: decimal
        .optional()
        .describe("Inclusive lowest amount, in the transaction's own currency."),
      amountMax: decimal
        .optional()
        .describe("Inclusive highest amount, in the transaction's own currency."),
      uncategorized: z
        .boolean()
        .optional()
        .describe("true keeps only transactions without a category."),
      sort: z.enum(["date", "description", "category", "account", "amount"]).optional(),
      direction: z.enum(["asc", "desc"]).optional(),
    }),
  },
  {
    name: "get_report_summary",
    path: "/api/reports/summary",
    description:
      "Summarise income and expenses over a range. Returns income, expense and net totals for an arbitrary date range, with the split by category, by tag and by payee, and optionally the same figures for an earlier period to compare with.",
    input: z.object({
      dateFrom: date
        .optional()
        .describe("Inclusive start date. Defaults to the start of the current month."),
      dateTo: date.optional().describe("Inclusive end date. Defaults to today."),
      comparison: z.enum(["none", "previousPeriod", "previousYear", "previousMonth"]).optional(),
    }),
  },
  {
    name: "list_budgets",
    path: "/api/budgets",
    description:
      "List budgets. Returns every budget you can see, each with its current window, the amount spent in that window, the base limit, the amount carried over and the effective limit.",
    input: z.object({
      asOf: date.optional().describe("Date whose budget window to show. Defaults to today."),
    }),
  },
  {
    name: "list_goals",
    path: "/api/goals",
    description:
      "List savings goals. Returns your savings goals with the amount saved so far against each target in progressAmount.",
    input: z.object({}),
  },
  {
    name: "get_net_worth",
    path: "/api/networth",
    description:
      "Get current net worth. Returns assets, debts and the difference between them as of now, in the reporting currency. isComplete is false when something could not be valued and was left out.",
    input: z.object({}),
  },
  {
    name: "list_recurring_entries",
    path: "/api/recurring-bills",
    description:
      "List recurring entries. Returns your scheduled expenses, income and transfers, each with its shape, its cadence and the date it next falls due. Inactive schedules are included.",
    input: z.object({}),
  },
];

async function answer(api: JxApi, tool: JxTool, args: Query) {
  try {
    const body = await api.get(tool.path, args);
    return { content: [{ type: "text" as const, text: JSON.stringify(body) }] };
  } catch (error) {
    if (error instanceof JxApiError) {
      return { content: [{ type: "text" as const, text: error.message }], isError: true };
    }

    throw error;
  }
}

export function createJxServer(api: JxApi) {
  const server = new McpServer({ name: "jx-finance", version: "0.1.0" });
  for (const tool of jxTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.input,
        annotations: { readOnlyHint: true, openWorldHint: false },
      },
      (args) => answer(api, tool, args as Query),
    );
  }

  return server;
}
