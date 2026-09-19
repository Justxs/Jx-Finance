using JxFinance.Common.Json;

namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionsSummaryResponse(int Count, [property: Money] decimal TotalIncome, [property: Money] decimal TotalExpense);
