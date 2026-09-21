namespace JxFinance.Endpoints.Transactions.BulkTagTransactions;

public sealed record BulkTagTransactionsRequest(IReadOnlyList<Guid> TransactionIds, IReadOnlyList<Guid> TagIds);
