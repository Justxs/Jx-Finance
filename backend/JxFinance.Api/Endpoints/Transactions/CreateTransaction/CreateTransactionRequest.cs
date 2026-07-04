using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.CreateTransaction;

public sealed record CreateTransactionRequest(
    Guid AccountId,
    Guid? CategoryId,
    FlowType Type,
    string Amount,
    DateOnly Date,
    string? Description);
