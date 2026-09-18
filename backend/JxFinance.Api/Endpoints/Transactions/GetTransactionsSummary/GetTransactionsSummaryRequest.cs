using JxFinance.Domain.Common;
using JxFinance.Endpoints.Transactions.Interfaces;

namespace JxFinance.Endpoints.Transactions.GetTransactionsSummary;

public sealed class GetTransactionsSummaryRequest : ITransactionFilter
{
    public Guid? AccountId { get; init; }

    public Guid? CategoryId { get; init; }

    public FlowType? Type { get; init; }

    public string? Search { get; init; }

    public DateOnly? DateFrom { get; init; }

    public DateOnly? DateTo { get; init; }
}
