using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.UpdateTransaction;

public sealed record UpdateTransactionRequest(
    Guid Id,
    Guid AccountId,
    Guid? CategoryId,
    FlowType Type,
    string Amount,
    DateOnly Date,
    string? Description,
    IReadOnlyList<TransactionLineRequest>? Lines);
