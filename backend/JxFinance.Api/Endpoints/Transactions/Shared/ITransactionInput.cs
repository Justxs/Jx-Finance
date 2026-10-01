using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

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
    IReadOnlyList<Guid>? TagIds { get; }
    Currency? Currency { get; }
    Guid? RefundOfTransactionId { get; }
    string? Note { get; }
    int? SpreadMonths { get; }
    SpreadDirection? SpreadDirection { get; }
    string? Place { get; }
    decimal? Latitude { get; }
    decimal? Longitude { get; }
}
