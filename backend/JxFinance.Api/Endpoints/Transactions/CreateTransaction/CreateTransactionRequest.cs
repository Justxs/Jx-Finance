using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed record CreateTransactionRequest(
    Guid AccountId,
    Guid? CategoryId,
    FlowType Type,
    [property: Money] decimal Amount,
    DateOnly Date,
    string? Description,
    IReadOnlyList<TransactionLineRequest>? Lines,
    IReadOnlyList<Guid>? TagIds = null,
    Currency? Currency = null,
    Guid? RefundOfTransactionId = null,
    string? Note = null,
    int? SpreadMonths = null,
    string? Place = null,
    decimal? Latitude = null,
    decimal? Longitude = null,
    SpreadDirection? SpreadDirection = null) : ITransactionInput;
