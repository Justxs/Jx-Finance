using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Trash.RestoreTransactions;

public sealed record RestoreTransactionsResponse(int Restored, IReadOnlyList<TransactionRefusalResponse> Refused);
