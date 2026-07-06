using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.GetTransactions;

public sealed class GetTransactionsRequest
{
    public int Page { get; init; } = 1;

    public int PageSize { get; init; } = 20;

    public Guid? AccountId { get; init; }

    public Guid? CategoryId { get; init; }

    public FlowType? Type { get; init; }

    public string? Search { get; init; }

    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }
}
