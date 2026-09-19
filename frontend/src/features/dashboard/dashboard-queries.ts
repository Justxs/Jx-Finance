import type { MonthlyTrendParams, TransactionsParams } from "@/api/generated/model";

export const monthlyTrendParams: MonthlyTrendParams = { months: 6 };

export const recentTransactionsParams: TransactionsParams = { page: 1, pageSize: 6 };
