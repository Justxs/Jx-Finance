namespace JxFinance.Endpoints.Trash.RestoreTransactions;

public sealed record RestoreTransactionsRequest(IReadOnlyList<Guid> TransactionIds);
