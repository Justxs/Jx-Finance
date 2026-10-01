namespace JxFinance.Endpoints.Transactions.BulkCategorizeTransactions;

public sealed record BulkCategorizeTransactionsRequest(
    IReadOnlyList<Guid> TransactionIds,
    Guid? CategoryId,
    bool OnlyUncategorized = false);
