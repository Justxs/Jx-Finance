using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.Shared;

public abstract class TransactionFilterRequest
{
    public Guid? AccountId { get; init; }

    public Guid? CategoryId { get; init; }

    public string? TagIds { get; init; }

    public FlowType? Type { get; init; }

    public string? Search { get; init; }

    public string? Payee { get; init; }

    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }

    public bool? Unusual { get; init; }

    public bool? Uncategorized { get; init; }
}
