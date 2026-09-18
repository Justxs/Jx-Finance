namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionsSummaryResponse(int Count, string TotalIncome, string TotalExpense);
