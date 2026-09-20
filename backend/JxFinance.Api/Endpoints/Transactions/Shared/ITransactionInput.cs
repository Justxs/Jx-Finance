using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.Shared;

public interface ITransactionInput
{
    Guid AccountId { get; }
    Guid? CategoryId { get; }
    FlowType Type { get; }
    decimal Amount { get; }
    DateOnly Date { get; }
    string? Description { get; }
    IReadOnlyList<TransactionLineRequest>? Lines { get; }
    Currency? Currency { get; }
}
