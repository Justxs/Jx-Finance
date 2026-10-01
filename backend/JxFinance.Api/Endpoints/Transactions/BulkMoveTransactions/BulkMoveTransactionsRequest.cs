namespace JxFinance.Endpoints.Transactions.BulkMoveTransactions;

public sealed record BulkMoveTransactionsRequest(IReadOnlyList<Guid> TransactionIds, Guid AccountId);
