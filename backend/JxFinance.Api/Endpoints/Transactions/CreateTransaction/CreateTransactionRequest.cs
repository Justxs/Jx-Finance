using JxFinance.Common.Json;
using JxFinance.Domain.Common;
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
    Currency? Currency = null) : ITransactionInput;
