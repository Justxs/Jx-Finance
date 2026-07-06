using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions;

public sealed record TransactionResponse(
    Guid Id,
    Guid AccountId,
    Guid? CategoryId,
    FlowType Type,
    string Amount,
    DateOnly Date,
    string? Description,
    TransactionSource Source,
    bool IsSplit,
    DateTimeOffset CreatedAt,
    IReadOnlyList<TransactionLineResponse>? Lines);
