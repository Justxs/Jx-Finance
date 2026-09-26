using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.Shared;

public abstract class TransactionFilterRequest
{
    public Guid? AccountId { get; init; }

    public Guid? CategoryId { get; init; }

    public string? TagIds { get; init; }

    public FlowType? Type { get; init; }

    public string? Search { get; init; }

    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }
}
