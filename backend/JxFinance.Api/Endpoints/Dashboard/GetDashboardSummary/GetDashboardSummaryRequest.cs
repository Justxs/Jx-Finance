using JxFinance.Common.SettleUp;

namespace JxFinance.Endpoints.Dashboard.GetDashboardSummary;

public sealed class GetDashboardSummaryRequest
{
    public string? Month { get; init; }

    public SpendingShare? Share { get; init; }
}
