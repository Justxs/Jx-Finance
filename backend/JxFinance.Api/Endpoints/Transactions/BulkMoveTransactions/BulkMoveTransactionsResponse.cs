using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.BulkMoveTransactions;

public sealed record BulkMoveTransactionsResponse(int Moved, IReadOnlyList<TransactionRefusalResponse> Refused);
