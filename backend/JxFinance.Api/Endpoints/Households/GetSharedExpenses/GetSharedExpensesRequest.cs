using JxFinance.Common;

namespace JxFinance.Endpoints.Households.GetSharedExpenses;

public sealed class GetSharedExpensesRequest : PagedRequest
{
    public Guid Id { get; init; }
}
