namespace JxFinance.Endpoints.Transactions.BulkDeleteTransactions;

public sealed record BulkDeleteTransactionsRequest(IReadOnlyList<Guid> TransactionIds);
