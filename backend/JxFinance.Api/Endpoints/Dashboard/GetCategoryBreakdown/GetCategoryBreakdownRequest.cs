using JxFinance.Common.SettleUp;

namespace JxFinance.Endpoints.Dashboard.GetCategoryBreakdown;

public sealed class GetCategoryBreakdownRequest
{
    public string? Month { get; init; }

    public SpendingShare? Share { get; init; }
}
