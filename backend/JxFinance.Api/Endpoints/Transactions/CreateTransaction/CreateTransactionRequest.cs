using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed record CreateTransactionRequest(
    Guid AccountId,
    Guid? CategoryId,
    FlowType Type,
    string Amount,
    DateOnly Date,
    string? Description,
    IReadOnlyList<TransactionLineRequest>? Lines,
    Currency? Currency = null);
