using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transactions.Interfaces;

public interface ITransactionFilter
{
    Guid? AccountId { get; }

    Guid? CategoryId { get; }

    FlowType? Type { get; }

    string? Search { get; }

    DateOnly? DateFrom { get; }

    DateOnly? DateTo { get; }
}
