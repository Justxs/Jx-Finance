using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionResponse(
    Guid Id,
    Guid AccountId,
    Guid? CategoryId,
    FlowType Type,
    [property: Money] decimal Amount,
    DateOnly Date,
    string? Description,
    TransactionSource Source,
    bool IsSplit,
    DateTimeOffset CreatedAt,
    IReadOnlyList<TransactionLineResponse>? Lines,
    Currency Currency,
    [property: Money] decimal ReportingAmount,
    IReadOnlyList<Guid> TagIds);
